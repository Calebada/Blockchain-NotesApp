const { AppError } = require("../common/app-error");
const {
  createNoteBlock,
  hashNoteBlock,
  isNoteBlockValid,
} = require("../domain/note-block");
const {
  NOTE_METADATA_LABEL,
  createProofHash,
  normalizeProofIntent,
} = require("../domain/note-proof");
const {
  getWalletUtxoSnapshot,
  logWalletUtxosAfterTransaction,
} = require("../services/blockfrost/wallet-utxos");

const silentLogger = {
  logBlockTransaction() {},
  logNoteTransaction() {},
};

const ACTIVITY_ACTIONS = {
  CREATE_NOTE: "CREATE_NOTE",
  UPDATE_NOTE: "UPDATE_NOTE",
  DELETE_NOTE: "DELETE_NOTE",
  RESTORE_NOTE: "RESTORE_NOTE",
  PERMANENT_DELETE_NOTE: "PERMANENT_DELETE_NOTE",
};

const DEFAULT_ACTIVITY_PAGE_SIZE = 10;
const MAX_ACTIVITY_PAGE_SIZE = 50;

function normalizeWalletAddress(walletAddress = "") {
  return typeof walletAddress === "string" && walletAddress.trim()
    ? walletAddress.trim()
    : "";
}

function normalizePagination(options = {}) {
  const page = Number.isSafeInteger(options.page) && options.page > 0 ? options.page : 1;
  const requestedPageSize =
    Number.isSafeInteger(options.pageSize) && options.pageSize > 0
      ? options.pageSize
      : DEFAULT_ACTIVITY_PAGE_SIZE;

  return {
    page,
    pageSize: Math.min(requestedPageSize, MAX_ACTIVITY_PAGE_SIZE),
  };
}

function createEmptyActivityPagination(pagination) {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function createActivityPagination({ page, pageSize, total }) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: totalPages > 0 && page < totalPages,
  };
}

function getNoteDetailsFromBlock(block) {
  return {
    noteId: block?.id ? String(block.id) : "",
    noteTitle: block?.note?.title || "",
    noteTag: block?.note?.tag || "General",
    noteContent: block?.note?.content || "",
  };
}

function getNoteDetailsFromRow(row) {
  return {
    noteId: row?.id ? String(row.id) : "",
    noteTitle: row?.title || "",
    noteTag: row?.tag || "General",
    noteContent: row?.content || "",
  };
}

function getTransactionDetailsFromBlock(block) {
  return {
    proofHash: block?.hash || "",
  };
}

function getMetadataPayload(metadataRows) {
  const metadataEntry = Array.isArray(metadataRows)
    ? metadataRows.find((entry) => String(entry.label) === NOTE_METADATA_LABEL)
    : null;
  let payload = metadataEntry?.json_metadata ?? null;

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (_error) {
      return null;
    }
  }

  return payload && typeof payload === "object" ? payload : null;
}

function isNotFoundError(error) {
  return error?.statusCode === 404 || error?.status_code === 404;
}

class NotesLedger {
  constructor(options = {}) {
    if (!options.client || !options.repository) {
      throw new TypeError("NotesLedger requires client and repository dependencies.");
    }

    this.client = options.client;
    this.repository = options.repository;
    this.logger = options.logger || silentLogger;
    this.logWalletUtxosAfterTransaction =
      options.logWalletUtxosAfterTransaction || logWalletUtxosAfterTransaction;
  }

  get provider() {
    return {
      name: "blockfrost",
      network: this.client.network,
      configured: this.client.isConfigured(),
      storage: this.repository.provider,
    };
  }

  async getLatestCardanoBlock() {
    const latestBlock = await this.client.getLatestBlock();

    return {
      hash: latestBlock.hash,
      height: latestBlock.height,
      slot: latestBlock.slot,
      epoch: latestBlock.epoch,
      txCount: latestBlock.tx_count,
      time: new Date(latestBlock.time * 1000).toISOString(),
    };
  }

  async loadChain(latestBlock) {
    return this.repository.listNoteBlocks({
      latestBlock,
      network: this.client.network,
    });
  }

  async loadDeletedNotes(latestBlock) {
    return this.repository.listDeletedNoteBlocks({
      latestBlock,
      network: this.client.network,
    });
  }

  async addNote({ author, title, tag, content }, options = {}) {
    this.assertProofMatchesMutation(
      ACTIVITY_ACTIONS.CREATE_NOTE,
      "",
      { title, tag, content },
      options
    );
    const latestBlock = await this.getLatestCardanoBlock();
    const chain = await this.loadChain(latestBlock);
    const existingBlock =
      options.cardanoTxHash &&
      typeof this.repository.findNoteBlockByTransactionHash === "function"
        ? await this.repository.findNoteBlockByTransactionHash(
            options.cardanoTxHash
          )
        : null;

    if (existingBlock) {
      await this.recordActivity(
        ACTIVITY_ACTIONS.CREATE_NOTE,
        existingBlock,
        options
      );

      return {
        block: existingBlock,
        valid: this.isChainValid(chain),
      };
    }

    const previousHash = chain.length > 0 ? chain[chain.length - 1].hash : latestBlock.hash;
    const block = createNoteBlock({
      index: chain.length + 1,
      author,
      title,
      tag,
      content,
      previousHash,
      anchor: {
        provider: "blockfrost",
        network: this.client.network,
        blockHash: latestBlock.hash,
        blockHeight: latestBlock.height,
        slot: latestBlock.slot,
        epoch: latestBlock.epoch,
        txCount: latestBlock.txCount,
        blockTime: latestBlock.time,
      },
    });

    const savedBlock = await this.repository.saveNoteBlock(block, {
      cardanoTxHash: options.cardanoTxHash || "",
    });
    const updatedChain = [...chain, savedBlock];
    this.logger.logBlockTransaction("CREATE_NOTE", savedBlock);
    await this.recordActivity(ACTIVITY_ACTIONS.CREATE_NOTE, savedBlock, options);
    await this.logWalletUtxos(options.walletAddress);

    return {
      block: savedBlock,
      valid: this.isChainValid(updatedChain),
    };
  }

  async updateNote(id, { author, title, tag, content }, options = {}) {
    this.assertProofMatchesMutation(
      ACTIVITY_ACTIONS.UPDATE_NOTE,
      id,
      { title, tag, content },
      options
    );
    const latestBlock = await this.getLatestCardanoBlock();
    const updatedRow = await this.repository.updateNoteBlock(id, {
      author,
      title,
      tag,
      content,
    });

    if (!updatedRow) {
      throw new AppError("Note not found.", 404);
    }

    await this.rebuildPersistedChains();
    const chain = await this.loadChain(latestBlock);
    const block = chain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (block) {
      this.logger.logBlockTransaction("UPDATE_NOTE", block);
      await this.recordActivity(ACTIVITY_ACTIONS.UPDATE_NOTE, block, options);
      await this.logWalletUtxos(options.walletAddress);
    }

    return {
      block,
      valid: this.isChainValid(chain),
    };
  }

  async deleteNote(id, options = {}) {
    const latestBlock = await this.getLatestCardanoBlock();
    const currentChain = await this.loadChain(latestBlock);
    const block =
      currentChain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (block) {
      this.assertProofMatchesMutation(
        ACTIVITY_ACTIONS.DELETE_NOTE,
        id,
        block.note,
        options
      );
    }

    const deletedRow = await this.repository.deleteNoteBlock(id);

    if (!deletedRow) {
      throw new AppError("Note not found.", 404);
    }

    await this.rebuildPersistedChains();
    const chain = await this.loadChain(latestBlock);
    this.logger.logNoteTransaction("DELETE_NOTE", {
      noteId: String(id),
      deletedAt: deletedRow.deletedAt || deletedRow.deleted_at || new Date().toISOString(),
    });
    await this.recordActivity(ACTIVITY_ACTIONS.DELETE_NOTE, block || deletedRow, options);

    return {
      deletedRow,
      valid: this.isChainValid(chain),
    };
  }

  async restoreNote(id, options = {}) {
    const latestBlock = await this.getLatestCardanoBlock();
    const deletedChain = await this.loadDeletedNotes(latestBlock);
    const deletedBlock =
      deletedChain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (deletedBlock) {
      this.assertProofMatchesMutation(
        ACTIVITY_ACTIONS.RESTORE_NOTE,
        id,
        deletedBlock.note,
        options
      );
    }

    const restoredRow = await this.repository.restoreNoteBlock(id);

    if (!restoredRow) {
      throw new AppError("Deleted note not found.", 404);
    }

    await this.rebuildPersistedChains();
    const chain = await this.loadChain(latestBlock);
    const block = chain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (block) {
      this.logger.logBlockTransaction("RESTORE_NOTE", block);
      await this.recordActivity(ACTIVITY_ACTIONS.RESTORE_NOTE, block, options);
      await this.logWalletUtxos(options.walletAddress);
    }

    return {
      block,
      valid: this.isChainValid(chain),
    };
  }

  async hardDeleteNote(id, options = {}) {
    const latestBlock = await this.getLatestCardanoBlock();
    const [currentChain, deletedChain] = await Promise.all([
      this.loadChain(latestBlock),
      this.loadDeletedNotes(latestBlock),
    ]);
    const block = [...currentChain, ...deletedChain].find(
      (chainBlock) => String(chainBlock.id) === String(id)
    );

    if (block) {
      this.assertProofMatchesMutation(
        ACTIVITY_ACTIONS.PERMANENT_DELETE_NOTE,
        id,
        block.note,
        options
      );
    }

    const deletedRow = await this.repository.hardDeleteNoteBlock(id);

    if (!deletedRow) {
      throw new AppError("Note not found.", 404);
    }

    await this.rebuildPersistedChains();
    const chain = await this.loadChain(latestBlock);
    this.logger.logNoteTransaction("PERMANENT_DELETE_NOTE", {
      noteId: String(id),
    });
    await this.recordActivity(
      ACTIVITY_ACTIONS.PERMANENT_DELETE_NOTE,
      block || deletedRow,
      options
    );

    return {
      deletedRow,
      valid: this.isChainValid(chain),
    };
  }

  async getState() {
    const latestBlock = await this.getLatestCardanoBlock();
    const chain = await this.loadChain(latestBlock);

    return {
      valid: this.isChainValid(chain),
      provider: this.provider,
      latestBlock,
      length: chain.length,
      chain,
    };
  }

  async getTrashState() {
    const latestBlock = await this.getLatestCardanoBlock();
    const chain = await this.loadDeletedNotes(latestBlock);

    return {
      valid: true,
      provider: this.provider,
      latestBlock,
      length: chain.length,
      chain,
    };
  }

  async getActivity(walletAddressOverride = "", options = {}) {
    const walletAddress = normalizeWalletAddress(walletAddressOverride);
    const pagination = normalizePagination(options.pagination);

    if (!walletAddress) {
      return {
        provider: this.provider,
        network: this.client.network,
        walletAddress,
        activity: [],
        pagination: createEmptyActivityPagination(pagination),
      };
    }

    const activityPage = await this.repository.listActivity({
      walletAddress,
      ...pagination,
    });
    const activity = Array.isArray(activityPage)
      ? activityPage
      : activityPage.activity || [];
    const total = Array.isArray(activityPage)
      ? activity.length
      : activityPage.total || 0;

    return {
      provider: this.provider,
      network: this.client.network,
      walletAddress,
      activity: await this.syncActivityStatuses(activity),
      pagination: createActivityPagination({ ...pagination, total }),
    };
  }

  async getWalletTransactions(walletAddressOverride = "") {
    const walletAddress = normalizeWalletAddress(walletAddressOverride);

    if (!walletAddress) {
      return {
        provider: this.provider,
        network: this.client.network,
        configured: false,
        walletAddress: "",
        fetchedAt: new Date().toISOString(),
        totalAda: "0.000000",
        totalLovelaces: "0",
        transactionCount: 0,
        transactions: [],
      };
    }

    const snapshot = await getWalletUtxoSnapshot(this.client, walletAddress);

    return {
      provider: this.provider,
      network: this.client.network,
      configured: true,
      walletAddress,
      fetchedAt: new Date().toISOString(),
      ...snapshot,
    };
  }

  async rebuildPersistedChains() {
    if (typeof this.repository.replaceNoteBlocks !== "function") {
      return;
    }

    const [activeBlocks, deletedBlocks] = await Promise.all([
      this.repository.listNoteBlocks({ network: this.client.network }),
      this.repository.listDeletedNoteBlocks({ network: this.client.network }),
    ]);

    await this.repository.replaceNoteBlocks([
      ...this.rebuildChain(activeBlocks),
      ...this.rebuildChain(deletedBlocks),
    ]);
  }

  rebuildChain(blocks) {
    let previousBlock = null;

    return blocks.map((storedBlock, index) => {
      const block = {
        ...storedBlock,
        index: index + 1,
        previousHash: previousBlock
          ? previousBlock.hash
          : storedBlock.anchor.blockHash,
      };

      block.hash = hashNoteBlock(block);
      previousBlock = block;
      return block;
    });
  }

  isChainValid(chain) {
    for (let index = 0; index < chain.length; index += 1) {
      const currentBlock = chain[index];
      const previousBlock = chain[index - 1];
      const expectedPreviousHash = previousBlock ? previousBlock.hash : currentBlock.anchor.blockHash;

      if (!isNoteBlockValid(currentBlock, expectedPreviousHash)) {
        return false;
      }
    }

    return true;
  }

  async logWalletUtxos(walletAddress) {
    try {
      await this.logWalletUtxosAfterTransaction(
        this.client,
        normalizeWalletAddress(walletAddress)
      );
    } catch (error) {
      console.warn("Wallet UTXO lookup failed:", error.message);
    }
  }

  assertProofMatchesMutation(action, noteId, note, options = {}) {
    if (!options.cardanoTxHash && !options.proofHash && !options.proofPayload) {
      return;
    }

    const expected = normalizeProofIntent({
      action,
      walletAddress: options.walletAddress,
      noteId,
      title: note?.title,
      tag: note?.tag,
      content: note?.content,
    });
    const actual = options.proofPayload
      ? normalizeProofIntent(options.proofPayload)
      : expected;

    if (
      JSON.stringify(actual) !== JSON.stringify(expected) ||
      createProofHash(actual) !== options.proofHash
    ) {
      throw new AppError(
        "The saved note action does not match the submitted Cardano proof.",
        409
      );
    }
  }

  async recordActivity(action, source, options = {}) {
    const walletAddress = normalizeWalletAddress(options.walletAddress);
    const details =
      source?.note || source?.anchor ? getNoteDetailsFromBlock(source) : getNoteDetailsFromRow(source);
    const proofPayload = options.proofPayload
      ? normalizeProofIntent(options.proofPayload)
      : walletAddress
        ? normalizeProofIntent({
            action,
            walletAddress,
            noteId:
              action === ACTIVITY_ACTIONS.CREATE_NOTE ? "" : details.noteId,
            title: details.noteTitle,
            tag: details.noteTag,
            content: details.noteContent,
          })
        : null;

    if (
      options.proofHash &&
      proofPayload &&
      createProofHash(proofPayload) !== options.proofHash
    ) {
      throw new AppError(
        "The recorded note action does not match its submitted proof hash.",
        409
      );
    }

    const entry = {
      action,
      walletAddress,
      network: this.client.network,
      ...details,
      ...getTransactionDetailsFromBlock(source),
      proofHash: options.proofHash || "",
      proofPayload,
      cardanoTxHash: options.cardanoTxHash || "",
      confirmationStatus:
        options.confirmationStatus || (options.cardanoTxHash ? "Pending" : "Failed"),
      validUntilSlot: options.validUntilSlot ?? null,
      noteSaveStatus: "Saved",
      noteSaveError: "",
    };
    const existing =
      entry.cardanoTxHash &&
      typeof this.repository.findActivityByTransactionHash === "function"
        ? await this.repository.findActivityByTransactionHash(entry.cardanoTxHash)
        : null;

    if (existing) {
      return this.repository.updateActivity(existing.id, {
        noteId: details.noteId,
        noteTitle: details.noteTitle,
        noteTag: details.noteTag,
        proofPayload,
        noteSaveStatus: "Saved",
        noteSaveError: "",
      });
    }

    return this.repository.recordActivity(entry);
  }

  async recordSubmittedProof(submission) {
    const proofPayload = normalizeProofIntent(submission.proofPayload);
    const proofHash = createProofHash(proofPayload);

    if (submission.proofHash !== proofHash) {
      throw new AppError(
        "The submitted transaction proof does not match its note action.",
        409
      );
    }

    const existing =
      typeof this.repository.findActivityByTransactionHash === "function"
        ? await this.repository.findActivityByTransactionHash(
            submission.cardanoTxHash
          )
        : null;

    if (existing) {
      return existing;
    }

    return this.repository.recordActivity({
      action: proofPayload.action,
      walletAddress: proofPayload.walletAddress,
      noteId: proofPayload.noteId,
      noteTitle: proofPayload.title,
      noteTag: proofPayload.tag,
      proofHash,
      proofPayload,
      cardanoTxHash: submission.cardanoTxHash,
      confirmationStatus: submission.confirmationStatus || "Pending",
      validUntilSlot: submission.validUntilSlot ?? null,
      noteSaveStatus: "Pending",
      noteSaveError: "",
      network: submission.network || this.client.network,
    });
  }

  async markNoteSaveFailed(cardanoTxHash, error) {
    if (!cardanoTxHash || typeof this.repository.findActivityByTransactionHash !== "function") {
      return null;
    }

    const activity = await this.repository.findActivityByTransactionHash(cardanoTxHash);

    if (!activity) {
      return null;
    }

    return this.repository.updateActivity(activity.id, {
      noteSaveStatus: "Failed",
      noteSaveError: error?.message || "Unable to save the note.",
    });
  }

  async getOwnedActivity(activityId, walletAddressOverride) {
    const walletAddress = normalizeWalletAddress(walletAddressOverride);
    const activity = await this.repository.getActivityById(activityId);

    if (!activity || !walletAddress || activity.walletAddress !== walletAddress) {
      throw new AppError("Proof record not found for this wallet.", 404);
    }

    return activity;
  }

  async verifyActivityProof(activityId, walletAddressOverride) {
    const activity = await this.getOwnedActivity(activityId, walletAddressOverride);

    if (!activity.cardanoTxHash || !activity.proofHash || !activity.proofPayload) {
      throw new AppError(
        "This legacy activity does not contain a complete verifiable proof.",
        409
      );
    }

    let transaction;

    try {
      transaction = await this.client.getTransaction(activity.cardanoTxHash);
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          verified: false,
          transactionExists: false,
          metadataMatches: false,
          actionMatches: false,
          message: "The Cardano transaction was not found.",
        };
      }

      throw error;
    }

    let metadataRows;

    try {
      metadataRows = await this.client.getTransactionMetadata(
        activity.cardanoTxHash
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        metadataRows = [];
      } else {
        throw error;
      }
    }

    const metadata = getMetadataPayload(metadataRows);
    const metadataMatches = metadata?.proofHash === activity.proofHash;
    const snapshotMatchesRecord =
      activity.proofPayload.title === activity.noteTitle &&
      activity.proofPayload.tag === activity.noteTag &&
      (activity.action === ACTIVITY_ACTIONS.CREATE_NOTE ||
        activity.proofPayload.noteId === activity.noteId);
    const actionMatches =
      metadata?.action === activity.action &&
      activity.proofPayload.action === activity.action &&
      createProofHash(activity.proofPayload) === activity.proofHash &&
      snapshotMatchesRecord;
    const blockDetails = await this.getCardanoBlockDetails(transaction);

    await this.repository.updateActivity(activity.id, {
      confirmationStatus: "Confirmed",
      ...blockDetails,
    });

    const verified = metadataMatches && actionMatches;

    return {
      verified,
      transactionExists: true,
      metadataMatches,
      actionMatches,
      message: verified
        ? "The Cardano transaction, metadata proof hash, and recorded note action all match."
        : !metadataMatches
          ? "The transaction exists, but its metadata does not contain the expected proof hash."
          : "The proof does not correspond to the recorded note action.",
      block: {
        hash: blockDetails.cardanoBlockHash,
        height: blockDetails.cardanoBlockHeight,
        slot: blockDetails.cardanoBlockSlot,
        epoch: blockDetails.cardanoBlockEpoch,
        time: blockDetails.cardanoBlockTime,
      },
    };
  }

  async retrySavingNote(activityId, walletAddressOverride) {
    const activity = await this.getOwnedActivity(activityId, walletAddressOverride);

    if (activity.noteSaveStatus === "Saved") {
      return { activity, retried: false, message: "The note is already saved." };
    }

    if (
      !activity.proofPayload ||
      createProofHash(activity.proofPayload) !== activity.proofHash ||
      activity.proofPayload.action !== activity.action
    ) {
      throw new AppError(
        "The stored note action does not match its proof and cannot be retried.",
        409
      );
    }

    const payload = activity.proofPayload;
    const options = {
      walletAddress: activity.walletAddress,
      proofHash: activity.proofHash,
      proofPayload: payload,
      cardanoTxHash: activity.cardanoTxHash,
      confirmationStatus: activity.confirmationStatus,
      validUntilSlot: activity.validUntilSlot,
    };
    let result;

    try {
      result = await this.retryProofAction(payload, options);
    } catch (error) {
      await this.markNoteSaveFailed(activity.cardanoTxHash, error).catch(() => {});
      throw error;
    }

    const savedActivity = await this.repository.findActivityByTransactionHash(
      activity.cardanoTxHash
    );

    return {
      activity: savedActivity,
      result,
      retried: true,
      message:
        "The note was saved using the existing Cardano transaction. No new transaction was submitted.",
    };
  }

  async retryProofAction(payload, options) {
    const note = {
      author: payload.walletAddress,
      title: payload.title,
      tag: payload.tag,
      content: payload.content,
    };
    const existingNote =
      payload.noteId && typeof this.repository.getNoteBlockById === "function"
        ? await this.repository.getNoteBlockById(payload.noteId)
        : null;

    if (payload.action === ACTIVITY_ACTIONS.CREATE_NOTE) {
      return this.addNote(note, options);
    }
    if (payload.action === ACTIVITY_ACTIONS.UPDATE_NOTE) {
      if (
        existingNote &&
        !existingNote.deletedAt &&
        existingNote.note.title === note.title &&
        existingNote.note.tag === note.tag &&
        existingNote.note.content === note.content
      ) {
        await this.recordActivity(payload.action, existingNote, options);
        return { block: existingNote, valid: true };
      }

      return this.updateNote(payload.noteId, note, options);
    }
    if (payload.action === ACTIVITY_ACTIONS.DELETE_NOTE) {
      if (existingNote?.deletedAt) {
        await this.recordActivity(payload.action, existingNote, options);
        return { deletedRow: existingNote, valid: true };
      }

      return this.deleteNote(payload.noteId, options);
    }
    if (payload.action === ACTIVITY_ACTIONS.RESTORE_NOTE) {
      if (existingNote && !existingNote.deletedAt) {
        await this.recordActivity(payload.action, existingNote, options);
        return { block: existingNote, valid: true };
      }

      return this.restoreNote(payload.noteId, options);
    }
    if (payload.action === ACTIVITY_ACTIONS.PERMANENT_DELETE_NOTE) {
      if (!existingNote) {
        await this.recordActivity(
          payload.action,
          {
            id: payload.noteId,
            note: {
              title: payload.title,
              tag: payload.tag,
              content: payload.content,
            },
          },
          options
        );
        return { deletedRow: null, valid: true };
      }

      return this.hardDeleteNote(payload.noteId, options);
    }

    throw new AppError("Unsupported note action.", 400);
  }

  async getCardanoBlockDetails(transaction) {
    let block = null;

    if (transaction.block && typeof this.client.getBlock === "function") {
      try {
        block = await this.client.getBlock(transaction.block);
      } catch (error) {
        console.warn("Cardano block detail lookup failed:", error.message);
      }
    }

    const blockTime = block?.time ?? transaction.block_time;

    return {
      cardanoBlockHash: transaction.block || block?.hash || "",
      cardanoBlockHeight: block?.height ?? transaction.block_height ?? null,
      cardanoBlockSlot: block?.slot ?? transaction.slot ?? null,
      cardanoBlockEpoch: block?.epoch ?? null,
      cardanoBlockTime: blockTime
        ? new Date(blockTime * 1000).toISOString()
        : null,
      confirmedAt: blockTime
        ? new Date(blockTime * 1000).toISOString()
        : new Date().toISOString(),
    };
  }

  async syncActivityStatuses(activity) {
    const pending = activity.filter(
      (entry) => entry.confirmationStatus === "Pending" && entry.cardanoTxHash
    );

    if (pending.length === 0 || typeof this.repository.updateActivity !== "function") {
      return activity;
    }

    let latestSlot = null;
    const getLatestSlot = async () => {
      if (latestSlot === null) {
        latestSlot = (await this.client.getLatestBlock()).slot;
      }
      return latestSlot;
    };

    const updates = new Map();

    await Promise.all(
      pending.map(async (entry) => {
        try {
          const transaction = await this.client.getTransaction(entry.cardanoTxHash);
          const blockDetails = await this.getCardanoBlockDetails(transaction);
          updates.set(
            entry.id,
            await this.repository.updateActivity(entry.id, {
              confirmationStatus: "Confirmed",
              ...blockDetails,
            })
          );
        } catch (error) {
          const isNotFound = isNotFoundError(error);

          if (isNotFound && entry.validUntilSlot !== null) {
            const currentSlot = await getLatestSlot();

            if (currentSlot > entry.validUntilSlot) {
              updates.set(
                entry.id,
                await this.repository.updateActivity(entry.id, {
                  confirmationStatus: "Failed",
                })
              );
            }
          } else if (!isNotFound) {
            console.warn("Cardano transaction status lookup failed:", error.message);
          }
        }
      })
    );

    return activity.map((entry) => updates.get(entry.id) || entry);
  }
}

module.exports = {
  NotesLedger,
};
