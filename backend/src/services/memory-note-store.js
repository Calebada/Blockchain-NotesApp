const { hashNoteBlock } = require("../entities/note-block");

function createTemporaryNoteBlocks(blocks, { latestBlock, network }) {
  if (!latestBlock) {
    return [...blocks];
  }

  let previousHash = latestBlock.hash;

  return blocks.map((storedBlock, index) => {
    const block = {
      ...storedBlock,
      index: index + 1,
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

class MemoryNoteStore {
  constructor() {
    this.blocks = [];
    this.nextId = 1;
  }

  get provider() {
    return {
      name: "memory",
      configured: true,
    };
  }

  async listNoteBlocks(options = {}) {
    return createTemporaryNoteBlocks(this.blocks, options);
  }

  async saveNoteBlock(block) {
    const blockToSave = {
      ...block,
      id: String(this.nextId),
    };

    this.nextId += 1;
    this.blocks.push(blockToSave);
    return blockToSave;
  }

  async updateNoteBlock(id, updates) {
    const blockIndex = this.blocks.findIndex((block) => String(block.id) === String(id));

    if (blockIndex === -1) {
      return null;
    }

    const existingBlock = this.blocks[blockIndex];
    const updatedBlock = {
      ...existingBlock,
      note: {
        ...existingBlock.note,
        author: updates.author || existingBlock.note.author,
        content: updates.content,
      },
    };

    this.blocks[blockIndex] = updatedBlock;
    return updatedBlock;
  }

  async deleteNoteBlock(id) {
    const blockIndex = this.blocks.findIndex((block) => String(block.id) === String(id));

    if (blockIndex === -1) {
      return null;
    }

    const [deletedBlock] = this.blocks.splice(blockIndex, 1);
    return deletedBlock;
  }
}

module.exports = {
  MemoryNoteStore,
};
