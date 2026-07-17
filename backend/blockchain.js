const crypto = require("crypto");

class Block {
  constructor(index, timestamp, note, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.note = note;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const blockData = `${this.index}${this.timestamp}${JSON.stringify(this.note)}${this.previousHash}`;

    return crypto.createHash("sha256").update(blockData).digest("hex");
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(
      0,
      new Date().toISOString(),
      {
        author: "system",
        content: "Genesis block for Blockchain Notes App",
      },
      "0"
    );
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addNote({ author, content }) {
    const previousBlock = this.getLatestBlock();
    const note = {
      author: author || "anonymous",
      content,
      securedAt: new Date().toISOString(),
    };

    const block = new Block(
      previousBlock.index + 1,
      new Date().toISOString(),
      note,
      previousBlock.hash
    );

    this.chain.push(block);
    return block;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i += 1) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }
}

module.exports = {
  Block,
  Blockchain,
};
