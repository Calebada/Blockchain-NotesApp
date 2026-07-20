const { AppError } = require("../common/app-error");
const { createNoteBlock, isNoteBlockValid } = require("../domain/note-block");
const {
  logWalletUtxosAfterTransaction,
} = require("../services/blockfrost/wallet-utxos");

const silentLogger = {
  logBlockTransaction() {},
  logNoteTransaction() {},
};

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

  async addNote({ author, title, tag, content }) {
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
    await this.logWalletUtxos();

    return {
      block: savedBlock,
      valid: this.isChainValid(updatedChain),
    };
  }

  async updateNote(id, { author, title, tag, content }) {
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
      await this.logWalletUtxos();
    }

    return {
      block,
      valid: this.isChainValid(chain),
    };
  }

  async deleteNote(id) {
    const latestBlock = await this.getLatestCardanoBlock();
    const deletedRow = await this.repository.deleteNoteBlock(id);

    if (!deletedRow) {
      throw new AppError("Note not found.", 404);
    }

    const chain = await this.loadChain(latestBlock);
    this.logger.logNoteTransaction("DELETE_NOTE", {
      noteId: String(id),
      deletedAt: deletedRow.deletedAt || deletedRow.deleted_at || new Date().toISOString(),
    });

    return {
      deletedRow,
      valid: this.isChainValid(chain),
    };
  }

  async restoreNote(id) {
    const latestBlock = await this.getLatestCardanoBlock();
    const restoredRow = await this.repository.restoreNoteBlock(id);

    if (!restoredRow) {
      throw new AppError("Deleted note not found.", 404);
    }

    const chain = await this.loadChain(latestBlock);
    const block = chain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (block) {
      this.logger.logBlockTransaction("RESTORE_NOTE", block);
      await this.logWalletUtxos();
    }

    return {
      block,
      valid: this.isChainValid(chain),
    };
  }

  async hardDeleteNote(id) {
    const latestBlock = await this.getLatestCardanoBlock();
    const deletedRow = await this.repository.hardDeleteNoteBlock(id);

    if (!deletedRow) {
      throw new AppError("Note not found.", 404);
    }

    const chain = await this.loadChain(latestBlock);
    this.logger.logNoteTransaction("PERMANENT_DELETE_NOTE", {
      noteId: String(id),
    });

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

  async logWalletUtxos() {
    try {
      await this.logWalletUtxosAfterTransaction(this.client);
    } catch (error) {
      console.warn("Wallet UTXO lookup failed:", error.message);
    }
  }
}

module.exports = {
  NotesLedger,
};
