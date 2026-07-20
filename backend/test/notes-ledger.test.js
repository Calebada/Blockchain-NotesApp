const assert = require("node:assert/strict");
const test = require("node:test");
const { NotesLedger } = require("../src/application/notes-ledger");
const {
  MemoryNotesRepository,
} = require("../src/services/persistence/memory-notes-repository");

const latestBlock = {
  hash: "a".repeat(64),
  height: 123,
  slot: 456,
  epoch: 7,
  tx_count: 8,
  time: 1_700_000_000,
};

function createLedger() {
  const client = {
    network: "mainnet",
    isConfigured: () => true,
    getLatestBlock: async () => latestBlock,
  };
  const logger = {
    logBlockTransaction() {},
    logNoteTransaction() {},
  };

  return new NotesLedger({
    client,
    logger,
    logWalletUtxosAfterTransaction: async () => {},
    repository: new MemoryNotesRepository(),
  });
}

test("executes the complete note lifecycle through application and persistence boundaries", async () => {
  const ledger = createLedger();
  const created = await ledger.addNote({
    author: "Ada",
    title: "Architecture",
    tag: "Work",
    content: "Keep dependencies pointing inward.",
  });

  assert.equal(created.valid, true);
  assert.equal(created.block.note.title, "Architecture");

  const updated = await ledger.updateNote(created.block.id, {
    author: "Ada",
    title: "Layered architecture",
    tag: "Work",
    content: "Keep dependencies pointing inward and adapters replaceable.",
  });

  assert.equal(updated.valid, true);
  assert.equal(updated.block.note.title, "Layered architecture");

  const deleted = await ledger.deleteNote(created.block.id);
  assert.equal(deleted.valid, true);
  assert.equal((await ledger.getState()).length, 0);
  assert.equal((await ledger.getTrashState()).length, 1);

  const restored = await ledger.restoreNote(created.block.id);
  assert.equal(restored.valid, true);
  assert.equal((await ledger.getState()).length, 1);

  const permanentlyDeleted = await ledger.hardDeleteNote(created.block.id);
  assert.equal(permanentlyDeleted.valid, true);
  assert.equal((await ledger.getState()).length, 0);
});

test("returns a typed not-found error from the application layer", async () => {
  const ledger = createLedger();

  await assert.rejects(
    () => ledger.updateNote("missing", { author: "Ada", content: "No note" }),
    (error) => error.statusCode === 404 && error.message === "Note not found."
  );
});
