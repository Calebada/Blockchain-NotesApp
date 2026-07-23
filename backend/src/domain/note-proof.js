const crypto = require("crypto");
const { AppError } = require("../common/app-error");

const NOTE_METADATA_LABEL = "1968";
const NOTE_TRANSACTION_VERSION = 1;
const ALLOWED_ACTIONS = new Set([
  "CREATE_NOTE",
  "UPDATE_NOTE",
  "DELETE_NOTE",
  "RESTORE_NOTE",
  "PERMANENT_DELETE_NOTE",
]);

function normalizeProofIntent(intent = {}) {
  if (!ALLOWED_ACTIONS.has(intent.action)) {
    throw new AppError("A valid note action is required.", 400);
  }

  if (typeof intent.walletAddress !== "string" || !intent.walletAddress.trim()) {
    throw new AppError("A connected Cardano wallet address is required.", 400);
  }

  return {
    version: NOTE_TRANSACTION_VERSION,
    action: intent.action,
    walletAddress: intent.walletAddress.trim(),
    noteId: intent.noteId ? String(intent.noteId) : "",
    title: typeof intent.title === "string" ? intent.title : "",
    tag: typeof intent.tag === "string" ? intent.tag : "General",
    content: typeof intent.content === "string" ? intent.content : "",
  };
}

function createProofHash(intent) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizeProofIntent(intent)))
    .digest("hex");
}

module.exports = {
  ALLOWED_ACTIONS,
  NOTE_METADATA_LABEL,
  NOTE_TRANSACTION_VERSION,
  createProofHash,
  normalizeProofIntent,
};
