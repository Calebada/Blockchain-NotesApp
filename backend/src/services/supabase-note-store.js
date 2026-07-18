const { createClient } = require("@supabase/supabase-js");
const { createSupabaseConfig } = require("../config/supabase-config");
const { hashNoteBlock } = require("../entities/note-block");

function toDatabaseRow(block) {
  return {
    author: block.note.author,
    title: block.note.title || "",
    tag: block.note.tag || "General",
    content: block.note.content,
    created_at: block.note.securedAt || block.timestamp,
    deleted_at: null,
  };
}

function createTemporaryNoteBlocks(rows, { latestBlock, network }) {
  if (!latestBlock) {
    return [];
  }

  let previousHash = latestBlock.hash;

  return rows.map((row, index) => {
    const timestamp = row.created_at;
    const block = {
      id: String(row.id),
      index: index + 1,
      timestamp,
      deletedAt: row.deleted_at || null,
      note: {
        author: row.author || "anonymous",
        title: row.title || "",
        tag: row.tag || "General",
        content: row.content,
        securedAt: timestamp,
      },
      previousHash,
      anchor: {
        provider: "blockfrost",
        network,
        blockHash: latestBlock.hash,
        blockHeight: latestBlock.height,
        slot: latestBlock.slot,
        epoch: latestBlock.epoch,
        txCount: latestBlock.txCount,
        blockTime: latestBlock.time,
      },
    };

    block.hash = hashNoteBlock(block);
    previousHash = block.hash;
    return block;
  });
}

function createStoreError(message, error) {
  const storeError = new Error(`${message}: ${error.message || error.details || "unknown Supabase error"}`);
  storeError.statusCode = error.code === "23505" ? 409 : 500;
  return storeError;
}

class SupabaseNoteStore {
  constructor(config = createSupabaseConfig()) {
    this.config = config;
    this.tableName = config.tableName;
    this.client = createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  get provider() {
    return {
      name: "supabase",
      table: this.tableName,
      configured: true,
    };
  }

  async listNoteBlocks(options = {}) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("id,author,title,tag,content,created_at,deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw createStoreError("Unable to load notes from Supabase", error);
    }

    return createTemporaryNoteBlocks(data, options);
  }

  async listDeletedNoteBlocks(options = {}) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("id,author,title,tag,content,created_at,deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .order("id", { ascending: true });

    if (error) {
      throw createStoreError("Unable to load deleted notes from Supabase", error);
    }

    return createTemporaryNoteBlocks(data, options);
  }

  async saveNoteBlock(block) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(toDatabaseRow(block))
      .select("id")
      .single();

    if (error) {
      throw createStoreError("Unable to save note to Supabase", error);
    }

    return {
      ...block,
      id: String(data.id),
    };
  }

  async updateNoteBlock(id, updates) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        author: updates.author,
        title: updates.title,
        tag: updates.tag,
        content: updates.content,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id,author,title,tag,content,created_at,deleted_at")
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to update note in Supabase", error);
    }

    return data;
  }

  async deleteNoteBlock(id) {
    const deletedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id,deleted_at")
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to delete note from Supabase", error);
    }

    return data;
  }

  async restoreNoteBlock(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select("id,author,title,tag,content,created_at,deleted_at")
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to restore note from Supabase", error);
    }

    return data;
  }

  async hardDeleteNoteBlock(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to permanently delete note from Supabase", error);
    }

    return data;
  }
}

module.exports = {
  SupabaseNoteStore,
};
