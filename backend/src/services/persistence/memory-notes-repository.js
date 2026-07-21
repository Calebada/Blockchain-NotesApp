const { hashNoteBlock } = require("../../domain/note-block");

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

class MemoryNotesRepository {
  constructor() {
    this.blocks = [];
    this.activity = [];
    this.nextId = 1;
    this.nextActivityId = 1;
  }

  get provider() {
    return {
      name: "memory",
      configured: true,
    };
  }

  async listNoteBlocks(options = {}) {
    return createTemporaryNoteBlocks(this.blocks.filter((block) => !block.deletedAt), options);
  }

  async listDeletedNoteBlocks(options = {}) {
    return createTemporaryNoteBlocks(this.blocks.filter((block) => block.deletedAt), options);
  }

  async listActivity(options = {}) {
    const walletAddress = options.walletAddress || "";
    const activity = walletAddress
      ? this.activity.filter((entry) => entry.walletAddress === walletAddress)
      : this.activity;

    return [...activity].sort((left, right) => {
      const timeDifference =
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return Number(right.id) - Number(left.id);
    });
  }

  async recordActivity(entry) {
    const activityEntry = {
      id: String(this.nextActivityId),
      action: entry.action,
      walletAddress: entry.walletAddress || "",
      noteId: entry.noteId ? String(entry.noteId) : "",
      noteTitle: entry.noteTitle || "",
      noteTag: entry.noteTag || "General",
      network: entry.network || "",
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    this.nextActivityId += 1;
    this.activity.push(activityEntry);
    return activityEntry;
  }

  async saveNoteBlock(block) {
    const blockToSave = {
      ...block,
      id: String(this.nextId),
      deletedAt: null,
    };

    this.nextId += 1;
    this.blocks.push(blockToSave);
    return blockToSave;
  }

  async updateNoteBlock(id, updates) {
    const blockIndex = this.blocks.findIndex((block) => String(block.id) === String(id) && !block.deletedAt);

    if (blockIndex === -1) {
      return null;
    }

    const existingBlock = this.blocks[blockIndex];
    const updatedBlock = {
      ...existingBlock,
      note: {
        ...existingBlock.note,
        author: updates.author || existingBlock.note.author,
        title: updates.title || existingBlock.note.title || "",
        tag: updates.tag || existingBlock.note.tag || "General",
        content: updates.content,
      },
    };

    this.blocks[blockIndex] = updatedBlock;
    return updatedBlock;
  }

  async deleteNoteBlock(id) {
    const blockIndex = this.blocks.findIndex((block) => String(block.id) === String(id) && !block.deletedAt);

    if (blockIndex === -1) {
      return null;
    }

    const deletedBlock = {
      ...this.blocks[blockIndex],
      deletedAt: new Date().toISOString(),
    };

    this.blocks[blockIndex] = deletedBlock;
    return deletedBlock;
  }

  async restoreNoteBlock(id) {
    const blockIndex = this.blocks.findIndex((block) => String(block.id) === String(id) && block.deletedAt);

    if (blockIndex === -1) {
      return null;
    }

    const restoredBlock = {
      ...this.blocks[blockIndex],
      deletedAt: null,
    };

    this.blocks[blockIndex] = restoredBlock;
    return restoredBlock;
  }

  async hardDeleteNoteBlock(id) {
    const blockIndex = this.blocks.findIndex((block) => String(block.id) === String(id));

    if (blockIndex === -1) {
      return null;
    }

    const [deletedBlock] = this.blocks.splice(blockIndex, 1);
    return deletedBlock;
  }
}

module.exports = {
  MemoryNotesRepository,
};
