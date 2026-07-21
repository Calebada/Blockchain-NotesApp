const { AppError } = require("../common/app-error");
const { createNoteBlock, isNoteBlockValid } = require("../domain/note-block");
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

function normalizeWalletAddress(walletAddress = "") {
  return typeof walletAddress === "string" && walletAddress.trim()
    ? walletAddress.trim()
    : "";
}

function getNoteDetailsFromBlock(block) {
  return {
    noteId: block?.id ? String(block.id) : "",
    noteTitle: block?.note?.title || "",
    noteTag: block?.note?.tag || "General",
  };
}

function getNoteDetailsFromRow(row) {
  return {
    noteId: row?.id ? String(row.id) : "",
    noteTitle: row?.title || "",
    noteTag: row?.tag || "General",
  };
}

function getTransactionDetailsFromBlock(block) {
  return {
    proofHash: block?.hash || "",
  };
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
    const latestBlock = await this.getLatestCardanoBlock();
    const chain = await this.loadChain(latestBlock);
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

    const savedBlock = await this.repository.saveNoteBlock(block);
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
    const deletedRow = await this.repository.deleteNoteBlock(id);

    if (!deletedRow) {
      throw new AppError("Note not found.", 404);
    }

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
    const restoredRow = await this.repository.restoreNoteBlock(id);

    if (!restoredRow) {
      throw new AppError("Deleted note not found.", 404);
    }

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
    const deletedRow = await this.repository.hardDeleteNoteBlock(id);

    if (!deletedRow) {
      throw new AppError("Note not found.", 404);
    }

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

  async getActivity(walletAddressOverride = "") {
    const walletAddress = normalizeWalletAddress(walletAddressOverride);
    const activity = walletAddress
      ? await this.repository.listActivity({ walletAddress })
      : [];

    return {
      provider: this.provider,
      network: this.client.network,
      walletAddress,
      activity: await this.syncActivityStatuses(activity),
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

  async recordActivity(action, source, options = {}) {
    const walletAddress = normalizeWalletAddress(options.walletAddress);
    const details =
      source?.note || source?.anchor ? getNoteDetailsFromBlock(source) : getNoteDetailsFromRow(source);

    try {
      await this.repository.recordActivity({
        action,
        walletAddress,
        network: this.client.network,
        ...details,
        ...getTransactionDetailsFromBlock(source),
        proofHash: options.proofHash || getTransactionDetailsFromBlock(source).proofHash,
        cardanoTxHash: options.cardanoTxHash || "",
        confirmationStatus:
          options.confirmationStatus || (options.cardanoTxHash ? "Pending" : "Failed"),
        validUntilSlot: options.validUntilSlot ?? null,
      });
    } catch (error) {
      console.warn("Note activity tracking failed:", error.message);
    }
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
          updates.set(
            entry.id,
            await this.repository.updateActivity(entry.id, {
              confirmationStatus: "Confirmed",
              cardanoBlockHash: transaction.block || "",
              cardanoBlockHeight: transaction.block_height ?? null,
              confirmedAt: transaction.block_time
                ? new Date(transaction.block_time * 1000).toISOString()
                : new Date().toISOString(),
            })
          );
        } catch (error) {
          const isNotFound = error.statusCode === 404 || error.status_code === 404;

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
