const { createClient } = require("@supabase/supabase-js");
const { AppError } = require("../../common/app-error");
const { createSupabaseConfig } = require("../../config/supabase-config");
const { hashNoteBlock } = require("../../domain/note-block");

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

function toActivityDatabaseRow(entry) {
  return {
    action: entry.action,
    wallet_address: entry.walletAddress || "",
    note_id: entry.noteId || null,
    note_title: entry.noteTitle || "",
    note_tag: entry.noteTag || "General",
    proof_hash: entry.proofHash || "",
    cardano_tx_hash: entry.cardanoTxHash || "",
    confirmation_status: entry.confirmationStatus || "Failed",
    cardano_block_hash: entry.cardanoBlockHash || "",
    cardano_block_height: entry.cardanoBlockHeight ?? null,
    valid_until_slot: entry.validUntilSlot ?? null,
    confirmed_at: entry.confirmedAt || null,
    network: entry.network || "",
    created_at: entry.createdAt || new Date().toISOString(),
  };
}

function toActivityEntry(row) {
  return {
    id: String(row.id),
    action: row.action,
    walletAddress: row.wallet_address || "",
    noteId: row.note_id ? String(row.note_id) : "",
    noteTitle: row.note_title || "",
    noteTag: row.note_tag || "General",
    proofHash: row.proof_hash || "",
    cardanoTxHash: row.cardano_tx_hash || "",
    confirmationStatus: row.confirmation_status || "Failed",
    cardanoBlockHash: row.cardano_block_hash || "",
    cardanoBlockHeight: row.cardano_block_height ?? null,
    validUntilSlot: row.valid_until_slot ?? null,
    confirmedAt: row.confirmed_at || null,
    network: row.network || "",
    createdAt: row.created_at,
  };
}

const ACTIVITY_COLUMNS =
  "id,action,wallet_address,note_id,note_title,note_tag,proof_hash,cardano_tx_hash,confirmation_status,cardano_block_hash,cardano_block_height,valid_until_slot,confirmed_at,network,created_at";

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
  return new AppError(
    `${message}: ${error.message || error.details || "unknown Supabase error"}`,
    error.code === "23505" ? 409 : 500,
    { cause: error }
  );
}

class SupabaseNotesRepository {
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

  async listActivity(options = {}) {
    let query = this.client
      .from("note_activity")
      .select(ACTIVITY_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50);

    if (options.walletAddress) {
      query = query.eq("wallet_address", options.walletAddress);
    }

    const { data, error } = await query;

    if (error) {
      throw createStoreError("Unable to load note activity from Supabase", error);
    }

    return data.map(toActivityEntry);
  }

  async recordActivity(entry) {
    const { data, error } = await this.client
      .from("note_activity")
      .insert(toActivityDatabaseRow(entry))
      .select(ACTIVITY_COLUMNS)
      .single();

    if (error) {
      throw createStoreError("Unable to save note activity to Supabase", error);
    }

    return toActivityEntry(data);
  }

  async updateActivity(id, updates) {
    const databaseUpdates = {};

    if (updates.confirmationStatus) {
      databaseUpdates.confirmation_status = updates.confirmationStatus;
    }
    if (updates.cardanoBlockHash !== undefined) {
      databaseUpdates.cardano_block_hash = updates.cardanoBlockHash;
    }
    if (updates.cardanoBlockHeight !== undefined) {
      databaseUpdates.cardano_block_height = updates.cardanoBlockHeight;
    }
    if (updates.confirmedAt !== undefined) {
      databaseUpdates.confirmed_at = updates.confirmedAt;
    }

    const { data, error } = await this.client
      .from("note_activity")
      .update(databaseUpdates)
      .eq("id", id)
      .select(ACTIVITY_COLUMNS)
      .single();

    if (error) {
      throw createStoreError("Unable to update note activity in Supabase", error);
    }

    return toActivityEntry(data);
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
      .select("id,author,title,tag,content,deleted_at")
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
      .select("id,author,title,tag,content")
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to permanently delete note from Supabase", error);
    }

    return data;
  }
}

module.exports = {
  SupabaseNotesRepository,
};
