const crypto = require("crypto");

function hashNoteBlock(block) {
  const blockData = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    note: block.note,
    previousHash: block.previousHash,
    anchor: block.anchor,
  });

  return crypto.createHash("sha256").update(blockData).digest("hex");
}

function createNoteBlock({ id, index, author, title, tag, content, previousHash, anchor }) {
  const block = {
    id,
    index,
    timestamp: new Date().toISOString(),
    note: {
      author: author || "anonymous",
      title: title || "",
      tag: tag || "General",
      content,
      securedAt: new Date().toISOString(),
    },
    previousHash,
    anchor,
  };

  block.hash = hashNoteBlock(block);
  return block;
}

function isNoteBlockValid(block, expectedPreviousHash) {
  return block.hash === hashNoteBlock(block) && block.previousHash === expectedPreviousHash;
}

module.exports = {
  createNoteBlock,
  hashNoteBlock,
  isNoteBlockValid,
};
