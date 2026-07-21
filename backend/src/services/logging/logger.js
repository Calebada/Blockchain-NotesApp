function logBlockTransaction(action, block) {
  console.info("Local note proof", {
    action,
    noteId: block.id || null,
    blockIndex: block.index,
    proofHash: block.hash,
    cardanoBlockHash: block.anchor.blockHash,
    cardanoBlockHeight: block.anchor.blockHeight,
    network: block.anchor.network,
  });
}

function logNoteTransaction(action, details) {
  console.info("Note transaction", {
    action,
    ...details,
  });
}

const logger = {
  logBlockTransaction,
  logNoteTransaction,
};

module.exports = {
  logger,
};
