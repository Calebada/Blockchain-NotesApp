class MemoryNoteStore {
  constructor() {
    this.blocks = [];
  }

  get provider() {
    return {
      name: "memory",
      configured: true,
    };
  }

  async listNoteBlocks() {
    return [...this.blocks];
  }

  async saveNoteBlock(block) {
    this.blocks.push(block);
    return block;
  }
}

module.exports = {
  MemoryNoteStore,
};
