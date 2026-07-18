const { createNoteBlock, isNoteBlockValid } = require("../entities/note-block");
const { BlockfrostClient } = require("./blockfrost-client");
const { createNoteStore } = require("./note-store");

function logBlockTransaction(action, block) {
  console.log("\n=== Block Transaction ===");
  console.log(`Action: ${action}`);
  console.log(`Block #${block.index}`);
  console.log(`Block ID: ${block.id || "pending"}`);
  console.log(`Block hash: ${block.hash}`);
  console.log(`Previous hash: ${block.previousHash}`);

  console.log("Transaction:");
  console.table([
    {
      action,
      blockIndex: block.index,
      transactionId: block.hash,
      author: block.note.author,
      title: block.note.title || "Untitled",
      tag: block.note.tag || "General",
      content: block.note.content,
      securedAt: block.note.securedAt,
    },
  ]);

  console.log("Cardano anchor:");
  console.table([
    {
      provider: block.anchor.provider,
      network: block.anchor.network,
      blockHash: block.anchor.blockHash,
      blockHeight: block.anchor.blockHeight,
      slot: block.anchor.slot,
      epoch: block.anchor.epoch,
      transactionsInAnchorBlock: block.anchor.txCount,
      blockTime: block.anchor.blockTime,
    },
  ]);

  console.log("=========================\n");
}

function logNoteTransaction(action, details) {
  console.log("\n=== Note Transaction ===");
  console.table([{ action, ...details }]);
  console.log("========================\n");
}

class NotesLedger {
  constructor(options = {}) {
    this.client = options.client || new BlockfrostClient(options.config);
    this.store = options.store || createNoteStore(options.storageOptions);
    this.chain = [];
  }

  get provider() {
    return {
      name: "blockfrost",
      network: this.client.network,
      configured: this.client.isConfigured(),
      storage: this.store.provider,
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
    this.chain = await this.store.listNoteBlocks({
      latestBlock,
      network: this.client.network,
    });
    return this.chain;
  }

  async loadDeletedNotes(latestBlock) {
    if (!this.store.listDeletedNoteBlocks) {
      return [];
    }

    return this.store.listDeletedNoteBlocks({
      latestBlock,
      network: this.client.network,
    });
  }

  async addNote({ author, title, tag, content }) {
    const latestBlock = await this.getLatestCardanoBlock();
    await this.loadChain(latestBlock);

    const previousHash = this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : latestBlock.hash;
    const block = createNoteBlock({
      index: this.chain.length + 1,
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

    const savedBlock = await this.store.saveNoteBlock(block);
    this.chain.push(savedBlock);
    logBlockTransaction("CREATE_NOTE", savedBlock);
    return savedBlock;
  }

  async updateNote(id, { author, title, tag, content }) {
    const latestBlock = await this.getLatestCardanoBlock();
    const updatedRow = await this.store.updateNoteBlock(id, { author, title, tag, content });

    if (!updatedRow) {
      const error = new Error("Note not found.");
      error.statusCode = 404;
      throw error;
    }

    const chain = await this.loadChain(latestBlock);
    const block = chain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (block) {
      logBlockTransaction("UPDATE_NOTE", block);
    }

    return block;
  }

  async deleteNote(id) {
    const latestBlock = await this.getLatestCardanoBlock();
    const deletedRow = await this.store.deleteNoteBlock(id);

    if (!deletedRow) {
      const error = new Error("Note not found.");
      error.statusCode = 404;
      throw error;
    }

    await this.loadChain(latestBlock);
    logNoteTransaction("DELETE_NOTE", {
      noteId: String(id),
      deletedAt: deletedRow.deletedAt || deletedRow.deleted_at || new Date().toISOString(),
    });
    return deletedRow;
  }

  async restoreNote(id) {
    const latestBlock = await this.getLatestCardanoBlock();
    const restoredRow = await this.store.restoreNoteBlock(id);

    if (!restoredRow) {
      const error = new Error("Deleted note not found.");
      error.statusCode = 404;
      throw error;
    }

    const chain = await this.loadChain(latestBlock);
    const block = chain.find((chainBlock) => String(chainBlock.id) === String(id)) || null;

    if (block) {
      logBlockTransaction("RESTORE_NOTE", block);
    }

    return block;
  }

  async hardDeleteNote(id) {
    const latestBlock = await this.getLatestCardanoBlock();
    const deletedRow = await this.store.hardDeleteNoteBlock(id);

    if (!deletedRow) {
      const error = new Error("Note not found.");
      error.statusCode = 404;
      throw error;
    }

    await this.loadChain(latestBlock);
    logNoteTransaction("PERMANENT_DELETE_NOTE", {
      noteId: String(id),
    });
    return deletedRow;
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

  isChainValid(chain = this.chain) {
    for (let i = 0; i < chain.length; i += 1) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];
      const expectedPreviousHash = previousBlock ? previousBlock.hash : currentBlock.anchor.blockHash;

      if (!isNoteBlockValid(currentBlock, expectedPreviousHash)) {
        return false;
      }
    }

    return true;
  }
}

module.exports = {
  NotesLedger,
};
