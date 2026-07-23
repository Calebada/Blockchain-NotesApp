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

  async listNoteBlocks() {
    return this.blocks.filter((block) => !block.deletedAt).map((block) => ({ ...block }));
  }

  async listDeletedNoteBlocks() {
    return this.blocks.filter((block) => block.deletedAt).map((block) => ({ ...block }));
  }

  async listActivity(options = {}) {
    const walletAddress = options.walletAddress || "";
    const activity = walletAddress
      ? this.activity.filter((entry) => entry.walletAddress === walletAddress)
      : this.activity;
    const page = Number.isSafeInteger(options.page) && options.page > 0 ? options.page : 1;
    const pageSize =
      Number.isSafeInteger(options.pageSize) && options.pageSize > 0
        ? options.pageSize
        : activity.length || 10;

    const sortedActivity = [...activity].sort((left, right) => {
      const timeDifference =
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return Number(right.id) - Number(left.id);
    });
    const start = (page - 1) * pageSize;

    return {
      activity: sortedActivity.slice(start, start + pageSize),
      total: sortedActivity.length,
    };
  }

  async recordActivity(entry) {
    const activityEntry = {
      id: String(this.nextActivityId),
      action: entry.action,
      walletAddress: entry.walletAddress || "",
      noteId: entry.noteId ? String(entry.noteId) : "",
      noteTitle: entry.noteTitle || "",
      noteTag: entry.noteTag || "General",
      proofHash: entry.proofHash || "",
      cardanoTxHash: entry.cardanoTxHash || "",
      confirmationStatus: entry.confirmationStatus || "Failed",
      cardanoBlockHash: entry.cardanoBlockHash || "",
      cardanoBlockHeight: entry.cardanoBlockHeight ?? null,
      cardanoBlockSlot: entry.cardanoBlockSlot ?? null,
      cardanoBlockEpoch: entry.cardanoBlockEpoch ?? null,
      cardanoBlockTime: entry.cardanoBlockTime || null,
      validUntilSlot: entry.validUntilSlot ?? null,
      confirmedAt: entry.confirmedAt || null,
      proofPayload: entry.proofPayload || null,
      noteSaveStatus: entry.noteSaveStatus || "Saved",
      noteSaveError: entry.noteSaveError || "",
      network: entry.network || "",
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    this.nextActivityId += 1;
    this.activity.push(activityEntry);
    return activityEntry;
  }

  async updateActivity(id, updates) {
    const index = this.activity.findIndex((entry) => String(entry.id) === String(id));

    if (index === -1) {
      return null;
    }

    this.activity[index] = {
      ...this.activity[index],
      ...updates,
    };
    return this.activity[index];
  }

  async getActivityById(id) {
    return (
      this.activity.find((entry) => String(entry.id) === String(id)) || null
    );
  }

  async findActivityByTransactionHash(cardanoTxHash) {
    return (
      this.activity.find((entry) => entry.cardanoTxHash === cardanoTxHash) || null
    );
  }

  async saveNoteBlock(block, options = {}) {
    if (options.cardanoTxHash) {
      const existingBlock = this.blocks.find(
        (candidate) =>
          candidate.createdByCardanoTxHash === options.cardanoTxHash
      );

      if (existingBlock) {
        return existingBlock;
      }
    }

    const blockToSave = {
      ...block,
      id: String(this.nextId),
      deletedAt: null,
      createdByCardanoTxHash: options.cardanoTxHash || "",
    };

    this.nextId += 1;
    this.blocks.push(blockToSave);
    return blockToSave;
  }

  async getNoteBlockById(id) {
    return (
      this.blocks.find((block) => String(block.id) === String(id)) || null
    );
  }

  async findNoteBlockByTransactionHash(cardanoTxHash) {
    return (
      this.blocks.find(
        (block) => block.createdByCardanoTxHash === cardanoTxHash
      ) || null
    );
  }

  async replaceNoteBlocks(blocks) {
    const replacements = new Map(
      blocks.map((block) => [String(block.id), block])
    );

    this.blocks = this.blocks.map((block) => {
      const replacement = replacements.get(String(block.id));
      return replacement
        ? {
            ...block,
            ...replacement,
            createdByCardanoTxHash: block.createdByCardanoTxHash || "",
          }
        : block;
    });
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
