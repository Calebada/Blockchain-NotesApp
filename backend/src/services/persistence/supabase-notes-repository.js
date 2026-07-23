const { createClient } = require("@supabase/supabase-js");
const { AppError } = require("../../common/app-error");
const { createSupabaseConfig } = require("../../config/supabase-config");
const { hashNoteBlock } = require("../../domain/note-block");

const LEGACY_GENESIS_HASH = "0".repeat(64);

function toDatabaseRow(block, options = {}) {
  return {
    author: block.note.author,
    title: block.note.title || "",
    tag: block.note.tag || "General",
    content: block.note.content,
    created_at: block.note.securedAt || block.timestamp,
    deleted_at: null,
    block_index: block.index,
    block_timestamp: block.timestamp,
    previous_hash: block.previousHash,
    block_hash: block.hash,
    anchor: block.anchor,
    created_by_cardano_tx_hash: options.cardanoTxHash || "",
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
    cardano_block_slot: entry.cardanoBlockSlot ?? null,
    cardano_block_epoch: entry.cardanoBlockEpoch ?? null,
    cardano_block_time: entry.cardanoBlockTime || null,
    valid_until_slot: entry.validUntilSlot ?? null,
    confirmed_at: entry.confirmedAt || null,
    proof_payload: entry.proofPayload || null,
    note_save_status: entry.noteSaveStatus || "Saved",
    note_save_error: entry.noteSaveError || "",
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
    cardanoBlockSlot: row.cardano_block_slot ?? null,
    cardanoBlockEpoch: row.cardano_block_epoch ?? null,
    cardanoBlockTime: row.cardano_block_time || null,
    validUntilSlot: row.valid_until_slot ?? null,
    confirmedAt: row.confirmed_at || null,
    proofPayload: row.proof_payload || null,
    noteSaveStatus: row.note_save_status || "Saved",
    noteSaveError: row.note_save_error || "",
    network: row.network || "",
    createdAt: row.created_at,
  };
}

const ACTIVITY_COLUMNS =
  "id,action,wallet_address,note_id,note_title,note_tag,proof_hash,cardano_tx_hash,confirmation_status,cardano_block_hash,cardano_block_height,cardano_block_slot,cardano_block_epoch,cardano_block_time,valid_until_slot,confirmed_at,proof_payload,note_save_status,note_save_error,network,created_at";

const NOTE_COLUMNS =
  "id,author,title,tag,content,created_at,deleted_at,block_index,block_timestamp,previous_hash,block_hash,anchor,created_by_cardano_tx_hash";

function toStoredNoteBlocks(rows, { network = "" } = {}) {
  let previousHash = LEGACY_GENESIS_HASH;

  return rows.map((row, index) => {
    const timestamp = row.block_timestamp || row.created_at;
    const anchor = row.anchor || {
      provider: "legacy",
      network,
      blockHash: LEGACY_GENESIS_HASH,
      blockHeight: 0,
      slot: 0,
      epoch: 0,
      txCount: 0,
      blockTime: row.created_at,
    };
    const block = {
      id: String(row.id),
      index: row.block_index || index + 1,
      timestamp,
      deletedAt: row.deleted_at || null,
      createdByCardanoTxHash: row.created_by_cardano_tx_hash || "",
      note: {
        author: row.author || "anonymous",
        title: row.title || "",
        tag: row.tag || "General",
        content: row.content,
        securedAt: timestamp,
      },
      previousHash: row.previous_hash || previousHash,
      anchor,
    };

    block.hash = row.block_hash || hashNoteBlock(block);
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
      .select(NOTE_COLUMNS)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw createStoreError("Unable to load notes from Supabase", error);
    }

    return toStoredNoteBlocks(data, options);
  }

  async listDeletedNoteBlocks(options = {}) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(NOTE_COLUMNS)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .order("id", { ascending: true });

    if (error) {
      throw createStoreError("Unable to load deleted notes from Supabase", error);
    }

    return toStoredNoteBlocks(data, options);
  }

  async listActivity(options = {}) {
    const page = Number.isSafeInteger(options.page) && options.page > 0 ? options.page : 1;
    const pageSize =
      Number.isSafeInteger(options.pageSize) && options.pageSize > 0 ? options.pageSize : 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = this.client
      .from("note_activity")
      .select(ACTIVITY_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (options.walletAddress) {
      query = query.eq("wallet_address", options.walletAddress);
    }

    const { data, error, count } = await query;

    if (error) {
      throw createStoreError("Unable to load note activity from Supabase", error);
    }

    return {
      activity: data.map(toActivityEntry),
      total: count || 0,
    };
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

    if (updates.confirmationStatus !== undefined) {
      databaseUpdates.confirmation_status = updates.confirmationStatus;
    }
    if (updates.noteId !== undefined) {
      databaseUpdates.note_id = updates.noteId || null;
    }
    if (updates.noteTitle !== undefined) {
      databaseUpdates.note_title = updates.noteTitle;
    }
    if (updates.noteTag !== undefined) {
      databaseUpdates.note_tag = updates.noteTag;
    }
    if (updates.cardanoBlockHash !== undefined) {
      databaseUpdates.cardano_block_hash = updates.cardanoBlockHash;
    }
    if (updates.cardanoBlockHeight !== undefined) {
      databaseUpdates.cardano_block_height = updates.cardanoBlockHeight;
    }
    if (updates.cardanoBlockSlot !== undefined) {
      databaseUpdates.cardano_block_slot = updates.cardanoBlockSlot;
    }
    if (updates.cardanoBlockEpoch !== undefined) {
      databaseUpdates.cardano_block_epoch = updates.cardanoBlockEpoch;
    }
    if (updates.cardanoBlockTime !== undefined) {
      databaseUpdates.cardano_block_time = updates.cardanoBlockTime;
    }
    if (updates.confirmedAt !== undefined) {
      databaseUpdates.confirmed_at = updates.confirmedAt;
    }
    if (updates.noteSaveStatus !== undefined) {
      databaseUpdates.note_save_status = updates.noteSaveStatus;
    }
    if (updates.noteSaveError !== undefined) {
      databaseUpdates.note_save_error = updates.noteSaveError;
    }
    if (updates.proofPayload !== undefined) {
      databaseUpdates.proof_payload = updates.proofPayload;
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

  async getActivityById(id) {
    const { data, error } = await this.client
      .from("note_activity")
      .select(ACTIVITY_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to load note activity from Supabase", error);
    }

    return data ? toActivityEntry(data) : null;
  }

  async findActivityByTransactionHash(cardanoTxHash) {
    const { data, error } = await this.client
      .from("note_activity")
      .select(ACTIVITY_COLUMNS)
      .eq("cardano_tx_hash", cardanoTxHash)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to load note activity from Supabase", error);
    }

    return data ? toActivityEntry(data) : null;
  }

  async saveNoteBlock(block, options = {}) {
    if (options.cardanoTxHash) {
      const existing = await this.findNoteBlockByTransactionHash(
        options.cardanoTxHash
      );

      if (existing) {
        return existing;
      }
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(toDatabaseRow(block, options))
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
      .select(NOTE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to update note in Supabase", error);
    }

    return data ? toStoredNoteBlocks([data], { network: "" })[0] : null;
  }

  async deleteNoteBlock(id) {
    const deletedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null)
      .select(NOTE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to delete note from Supabase", error);
    }

    return data ? toStoredNoteBlocks([data], { network: "" })[0] : null;
  }

  async restoreNoteBlock(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select(NOTE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to restore note from Supabase", error);
    }

    return data ? toStoredNoteBlocks([data], { network: "" })[0] : null;
  }

  async hardDeleteNoteBlock(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .delete()
      .eq("id", id)
      .select(NOTE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to permanently delete note from Supabase", error);
    }

    return data ? toStoredNoteBlocks([data], { network: "" })[0] : null;
  }

  async getNoteBlockById(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(NOTE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to load note from Supabase", error);
    }

    return data ? toStoredNoteBlocks([data], { network: "" })[0] : null;
  }

  async findNoteBlockByTransactionHash(cardanoTxHash) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(NOTE_COLUMNS)
      .eq("created_by_cardano_tx_hash", cardanoTxHash)
      .maybeSingle();

    if (error) {
      throw createStoreError("Unable to load note from Supabase", error);
    }

    return data ? toStoredNoteBlocks([data], { network: "" })[0] : null;
  }

  async replaceNoteBlocks(blocks) {
    if (blocks.length === 0) {
      return;
    }

    const rows = blocks.map((block) => ({
      id: block.id,
      block_index: block.index,
      block_timestamp: block.timestamp,
      previous_hash: block.previousHash,
      block_hash: block.hash,
      anchor: block.anchor,
    }));
    const { error } = await this.client
      .from(this.tableName)
      .upsert(rows, { onConflict: "id" });

    if (error) {
      throw createStoreError("Unable to persist note proof chain", error);
    }
  }
}

module.exports = {
  SupabaseNotesRepository,
};
