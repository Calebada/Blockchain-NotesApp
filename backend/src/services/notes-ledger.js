const { createNoteBlock, isNoteBlockValid } = require("../entities/note-block");
const { BlockfrostClient } = require("./blockfrost-client");
const { createNoteStore } = require("./note-store");

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

  async addNote({ author, content }) {
    const latestBlock = await this.getLatestCardanoBlock();
    await this.loadChain(latestBlock);

    const previousHash = this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : latestBlock.hash;
    const block = createNoteBlock({
      index: this.chain.length + 1,
      author,
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
    return savedBlock;
  }

  async updateNote(id, { author, content }) {
    const latestBlock = await this.getLatestCardanoBlock();
    const updatedRow = await this.store.updateNoteBlock(id, { author, content });

    if (!updatedRow) {
      const error = new Error("Note not found.");
      error.statusCode = 404;
      throw error;
    }

    const chain = await this.loadChain(latestBlock);
    return chain.find((block) => String(block.id) === String(id)) || null;
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
