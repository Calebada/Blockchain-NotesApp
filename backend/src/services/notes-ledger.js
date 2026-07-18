const { createNoteBlock, isNoteBlockValid } = require("../entities/note-block");
const { BlockfrostClient } = require("./blockfrost-client");

class NotesLedger {
  constructor(options = {}) {
    this.client = options.client || new BlockfrostClient(options.config);
    this.chain = [];
  }

  get provider() {
    return {
      name: "blockfrost",
      network: this.client.network,
      configured: this.client.isConfigured(),
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

  async addNote({ author, content }) {
    const latestBlock = await this.getLatestCardanoBlock();
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

    this.chain.push(block);
    return block;
  }

  async getState() {
    return {
      valid: this.isChainValid(),
      provider: this.provider,
      latestBlock: await this.getLatestCardanoBlock(),
      length: this.chain.length,
      chain: this.chain,
    };
  }

  isChainValid() {
    for (let i = 0; i < this.chain.length; i += 1) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
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
