const { createClient } = require("@supabase/supabase-js");
const { createSupabaseConfig } = require("../config/supabase-config");

function toDatabaseRow(block) {
  return {
    block_index: block.index,
    timestamp: block.timestamp,
    note: block.note,
    previous_hash: block.previousHash,
    hash: block.hash,
    anchor: block.anchor,
  };
}

function fromDatabaseRow(row) {
  return {
    index: row.block_index,
    timestamp: row.timestamp,
    note: row.note,
    previousHash: row.previous_hash,
    hash: row.hash,
    anchor: row.anchor,
  };
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

  async listNoteBlocks() {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("block_index,timestamp,note,previous_hash,hash,anchor")
      .order("block_index", { ascending: true });

    if (error) {
      throw createStoreError("Unable to load notes from Supabase", error);
    }

    return data.map(fromDatabaseRow);
  }

  async saveNoteBlock(block) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(toDatabaseRow(block))
      .select("block_index,timestamp,note,previous_hash,hash,anchor")
      .single();

    if (error) {
      throw createStoreError("Unable to save note to Supabase", error);
    }

    return fromDatabaseRow(data);
  }
}

module.exports = {
  SupabaseNoteStore,
};
