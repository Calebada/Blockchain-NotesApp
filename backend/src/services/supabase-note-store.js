const { createClient } = require("@supabase/supabase-js");
const { createSupabaseConfig } = require("../config/supabase-config");
const { hashNoteBlock } = require("../entities/note-block");

function toDatabaseRow(block) {
  return {
    author: block.note.author,
    content: block.note.content,
    created_at: block.note.securedAt || block.timestamp,
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
      index: index + 1,
      timestamp,
      note: {
        author: row.author || "anonymous",
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
      .select("id,author,content,created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw createStoreError("Unable to load notes from Supabase", error);
    }

    return createTemporaryNoteBlocks(data, options);
  }

  async saveNoteBlock(block) {
    const { error } = await this.client.from(this.tableName).insert(toDatabaseRow(block));

    if (error) {
      throw createStoreError("Unable to save note to Supabase", error);
    }

    return block;
  }
}

module.exports = {
  SupabaseNoteStore,
};
