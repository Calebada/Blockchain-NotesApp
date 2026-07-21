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
    network: "preprod",
    isConfigured: () => true,
    getLatestBlock: async () => latestBlock,
    getAddressUtxos: async () => [],
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

test("uses a connected wallet address when fetching wallet transactions", async () => {
  const requestedWalletAddresses = [];
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getLatestBlock: async () => latestBlock,
      getAddressUtxos: async (walletAddress) => {
        requestedWalletAddresses.push(walletAddress);

        return [
          {
            tx_hash: "abc",
            output_index: 0,
            amount: [{ unit: "lovelace", quantity: "1000000" }],
          },
        ];
      },
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    logWalletUtxosAfterTransaction: async () => {},
    repository: new MemoryNotesRepository(),
  });

  const walletTransactions = await ledger.getWalletTransactions("addr_test_connected_wallet");

  assert.deepEqual(requestedWalletAddresses, ["addr_test_connected_wallet"]);
  assert.equal(walletTransactions.walletAddress, "addr_test_connected_wallet");
  assert.equal(walletTransactions.totalAda, "1.000000");
});

test("uses the connected wallet address for post-mutation UTXO logging", async () => {
  const requestedWalletAddresses = [];
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getLatestBlock: async () => latestBlock,
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    logWalletUtxosAfterTransaction: async (_client, walletAddress) => {
      requestedWalletAddresses.push(walletAddress);
    },
    repository: new MemoryNotesRepository(),
  });
  const walletAddress = "addr_test_connected_wallet";
  const created = await ledger.addNote(
    {
      author: walletAddress,
      title: "Connected wallet",
      tag: "General",
      content: "Create with connected wallet.",
    },
    { walletAddress }
  );

  await ledger.updateNote(
    created.block.id,
    {
      author: walletAddress,
      title: "Connected wallet updated",
      tag: "General",
      content: "Update with connected wallet.",
    },
    { walletAddress }
  );
  await ledger.deleteNote(created.block.id);
  await ledger.restoreNote(created.block.id, { walletAddress });

  assert.deepEqual(requestedWalletAddresses, [
    walletAddress,
    walletAddress,
    walletAddress,
  ]);
});

test("tracks note activity for the connected wallet", async () => {
  const ledger = createLedger();
  const walletAddress = "addr_test_connected_wallet";
  const created = await ledger.addNote(
    {
      author: walletAddress,
      title: "Tracked note",
      tag: "Work",
      content: "Create an activity entry.",
    },
    { walletAddress }
  );

  await ledger.updateNote(
    created.block.id,
    {
      author: walletAddress,
      title: "Tracked note updated",
      tag: "Ideas",
      content: "Update activity entry.",
    },
    { walletAddress }
  );
  await ledger.deleteNote(created.block.id, { walletAddress });
  await ledger.restoreNote(created.block.id, { walletAddress });
  await ledger.hardDeleteNote(created.block.id, { walletAddress });

  const activity = await ledger.getActivity(walletAddress);

  assert.deepEqual(
    activity.activity.map((entry) => entry.action),
    [
      "PERMANENT_DELETE_NOTE",
      "RESTORE_NOTE",
      "DELETE_NOTE",
      "UPDATE_NOTE",
      "CREATE_NOTE",
    ]
  );
  assert.equal(activity.activity[0].walletAddress, walletAddress);
  assert.equal(activity.activity[0].noteId, created.block.id);
  assert.equal(activity.activity[0].proofHash.length, 64);
  assert.equal(activity.activity[0].cardanoTxHash, "");
  assert.equal(activity.activity[0].confirmationStatus, "Failed");
  assert.equal(activity.activity[0].cardanoBlockHash, "");
  assert.equal(activity.activity[0].cardanoBlockHeight, null);
  assert.ok(
    activity.activity.every(
      (entry) =>
        entry.proofHash &&
        entry.cardanoTxHash === "" &&
        entry.confirmationStatus === "Failed"
    )
  );
});

test("confirms submitted Cardano transactions when activity is loaded", async () => {
  const repository = new MemoryNotesRepository();
  const cardanoTxHash = "b".repeat(64);
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getLatestBlock: async () => latestBlock,
      getTransaction: async () => ({
        block: "c".repeat(64),
        block_height: 987654,
        block_time: 1_700_000_100,
      }),
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    logWalletUtxosAfterTransaction: async () => {},
    repository,
  });
  const walletAddress = "addr_test_connected_wallet";

  await ledger.addNote(
    {
      author: walletAddress,
      title: "Confirmed proof",
      tag: "Work",
      content: "Track the real transaction.",
    },
    {
      walletAddress,
      proofHash: "a".repeat(64),
      cardanoTxHash,
      confirmationStatus: "Pending",
      validUntilSlot: latestBlock.slot + 3600,
    }
  );

  const [entry] = (await ledger.getActivity(walletAddress)).activity;
  assert.equal(entry.proofHash, "a".repeat(64));
  assert.equal(entry.cardanoTxHash, cardanoTxHash);
  assert.equal(entry.confirmationStatus, "Confirmed");
  assert.equal(entry.cardanoBlockHash, "c".repeat(64));
  assert.equal(entry.cardanoBlockHeight, 987654);
});

test("returns no activity until a wallet address is provided", async () => {
  const ledger = createLedger();

  await ledger.addNote({
    author: "addr_test_connected_wallet",
    title: "Hidden until scoped",
    tag: "Work",
    content: "Activity requires a wallet.",
  });

  assert.deepEqual((await ledger.getActivity()).activity, []);
});
