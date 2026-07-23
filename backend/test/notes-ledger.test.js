const assert = require("node:assert/strict");
const test = require("node:test");
const { NotesLedger } = require("../src/application/notes-ledger");
const { createProofHash } = require("../src/domain/note-proof");
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
    getTransaction: async () => {
      const error = new Error("Not found");
      error.statusCode = 404;
      throw error;
    },
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
  assert.equal(activity.activity[0].proofHash, "");
  assert.equal(activity.activity[0].cardanoTxHash, "");
  assert.equal(activity.activity[0].confirmationStatus, "Failed");
  assert.equal(activity.activity[0].cardanoBlockHash, "");
  assert.equal(activity.activity[0].cardanoBlockHeight, null);
  assert.ok(
    activity.activity.every(
      (entry) =>
        !entry.proofHash &&
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
  const proofPayload = {
    action: "CREATE_NOTE",
    walletAddress,
    title: "Confirmed proof",
    tag: "Work",
    content: "Track the real transaction.",
  };

  await ledger.addNote(
    {
      author: walletAddress,
      title: "Confirmed proof",
      tag: "Work",
      content: "Track the real transaction.",
    },
    {
      walletAddress,
      proofHash: createProofHash(proofPayload),
      proofPayload,
      cardanoTxHash,
      confirmationStatus: "Pending",
      validUntilSlot: latestBlock.slot + 3600,
    }
  );

  const [entry] = (await ledger.getActivity(walletAddress)).activity;
  assert.equal(entry.proofHash, createProofHash(proofPayload));
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

test("persists the submitted proof before saving the note and completes the same record", async () => {
  const ledger = createLedger();
  const walletAddress = "addr_test_persistent_proof";
  const proofPayload = {
    action: "CREATE_NOTE",
    walletAddress,
    title: "Durable proof",
    tag: "Work",
    content: "Persist this exact action snapshot.",
  };
  const proofHash = createProofHash(proofPayload);
  const cardanoTxHash = "1".repeat(64);
  const submitted = await ledger.recordSubmittedProof({
    proofHash,
    proofPayload,
    cardanoTxHash,
    confirmationStatus: "Pending",
    validUntilSlot: 9000,
    network: "preprod",
  });

  assert.equal(submitted.noteSaveStatus, "Pending");
  assert.equal(submitted.cardanoTxHash, cardanoTxHash);
  assert.deepEqual(submitted.proofPayload, {
    version: 1,
    action: "CREATE_NOTE",
    walletAddress,
    noteId: "",
    title: "Durable proof",
    tag: "Work",
    content: "Persist this exact action snapshot.",
  });

  const saved = await ledger.addNote(
    {
      author: walletAddress,
      title: proofPayload.title,
      tag: proofPayload.tag,
      content: proofPayload.content,
    },
    {
      walletAddress,
      proofHash,
      proofPayload,
      cardanoTxHash,
      confirmationStatus: "Pending",
      validUntilSlot: 9000,
    }
  );
  const activity = await ledger.getActivity(walletAddress);

  assert.equal(activity.activity.length, 1);
  assert.equal(activity.activity[0].id, submitted.id);
  assert.equal(activity.activity[0].noteId, saved.block.id);
  assert.equal(activity.activity[0].noteSaveStatus, "Saved");
  assert.equal(activity.activity[0].proofHash, proofHash);
});

test("verifies transaction existence, on-chain metadata, and the recorded action snapshot", async () => {
  const repository = new MemoryNotesRepository();
  const walletAddress = "addr_test_verifiable_proof";
  const proofPayload = {
    action: "UPDATE_NOTE",
    walletAddress,
    noteId: "7",
    title: "Verified",
    tag: "Ideas",
    content: "The immutable action snapshot.",
  };
  const proofHash = createProofHash(proofPayload);
  const cardanoTxHash = "2".repeat(64);
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getTransaction: async () => ({
        block: "3".repeat(64),
        block_height: 654321,
        block_time: 1_700_000_200,
        slot: 555,
      }),
      getTransactionMetadata: async () => [
        {
          label: "1968",
          json_metadata: {
            app: "Notetify",
            version: 1,
            action: "UPDATE_NOTE",
            proofHash,
          },
        },
      ],
      getBlock: async () => ({
        hash: "3".repeat(64),
        height: 654321,
        slot: 555,
        epoch: 91,
        time: 1_700_000_200,
      }),
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    repository,
  });
  const activity = await ledger.recordSubmittedProof({
    proofHash,
    proofPayload,
    cardanoTxHash,
    confirmationStatus: "Pending",
    network: "preprod",
  });

  const result = await ledger.verifyActivityProof(activity.id, walletAddress);
  const stored = await repository.getActivityById(activity.id);

  assert.equal(result.verified, true);
  assert.equal(result.transactionExists, true);
  assert.equal(result.metadataMatches, true);
  assert.equal(result.actionMatches, true);
  assert.equal(stored.confirmationStatus, "Confirmed");
  assert.equal(stored.cardanoBlockHash, "3".repeat(64));
  assert.equal(stored.cardanoBlockHeight, 654321);
  assert.equal(stored.cardanoBlockSlot, 555);
  assert.equal(stored.cardanoBlockEpoch, 91);
});

test("reports an on-chain metadata mismatch without accepting the proof", async () => {
  const repository = new MemoryNotesRepository();
  const walletAddress = "addr_test_mismatched_proof";
  const proofPayload = {
    action: "DELETE_NOTE",
    walletAddress,
    noteId: "9",
  };
  const activity = await repository.recordActivity({
    action: "DELETE_NOTE",
    walletAddress,
    noteId: "9",
    proofHash: createProofHash(proofPayload),
    proofPayload: {
      version: 1,
      action: "DELETE_NOTE",
      walletAddress,
      noteId: "9",
      title: "",
      tag: "General",
      content: "",
    },
    cardanoTxHash: "4".repeat(64),
    confirmationStatus: "Confirmed",
    noteSaveStatus: "Saved",
    network: "preprod",
  });
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getTransaction: async () => ({ block: "5".repeat(64) }),
      getTransactionMetadata: async () => [
        {
          label: "1968",
          json_metadata: {
            action: "DELETE_NOTE",
            proofHash: "f".repeat(64),
          },
        },
      ],
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    repository,
  });

  const result = await ledger.verifyActivityProof(activity.id, walletAddress);

  assert.equal(result.verified, false);
  assert.equal(result.transactionExists, true);
  assert.equal(result.metadataMatches, false);
  assert.equal(result.actionMatches, true);
});

test("reports a missing Cardano transaction as an unverified proof", async () => {
  const repository = new MemoryNotesRepository();
  const walletAddress = "addr_test_missing_transaction";
  const proofPayload = {
    action: "CREATE_NOTE",
    walletAddress,
    title: "Missing transaction",
    tag: "General",
    content: "This lookup should fail clearly.",
  };
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getTransaction: async () => {
        const error = new Error("Not found");
        error.statusCode = 404;
        throw error;
      },
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    repository,
  });
  const activity = await ledger.recordSubmittedProof({
    proofHash: createProofHash(proofPayload),
    proofPayload,
    cardanoTxHash: "8".repeat(64),
    confirmationStatus: "Pending",
    network: "preprod",
  });

  const result = await ledger.verifyActivityProof(activity.id, walletAddress);

  assert.equal(result.verified, false);
  assert.equal(result.transactionExists, false);
  assert.match(result.message, /not found/i);
});

test("retries only note persistence after a partial failure and never submits another transaction", async () => {
  class FailOnceNotesRepository extends MemoryNotesRepository {
    constructor() {
      super();
      this.saveAttempts = 0;
    }

    async saveNoteBlock(block, options) {
      this.saveAttempts += 1;

      if (this.saveAttempts === 1) {
        throw new Error("Temporary note storage failure.");
      }

      return super.saveNoteBlock(block, options);
    }
  }

  const repository = new FailOnceNotesRepository();
  let transactionSubmissions = 0;
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getLatestBlock: async () => latestBlock,
      submitTransaction: async () => {
        transactionSubmissions += 1;
        return "unexpected";
      },
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    logWalletUtxosAfterTransaction: async () => {},
    repository,
  });
  const walletAddress = "addr_test_retry_proof";
  const proofPayload = {
    action: "CREATE_NOTE",
    walletAddress,
    title: "Retry me",
    tag: "Work",
    content: "Use the existing transaction.",
  };
  const proofHash = createProofHash(proofPayload);
  const cardanoTxHash = "6".repeat(64);
  const activity = await ledger.recordSubmittedProof({
    proofHash,
    proofPayload,
    cardanoTxHash,
    confirmationStatus: "Pending",
    network: "preprod",
  });
  const note = {
    author: walletAddress,
    title: proofPayload.title,
    tag: proofPayload.tag,
    content: proofPayload.content,
  };
  const options = {
    walletAddress,
    proofHash,
    proofPayload,
    cardanoTxHash,
    confirmationStatus: "Pending",
  };

  await assert.rejects(() => ledger.addNote(note, options), /storage failure/);
  await ledger.markNoteSaveFailed(cardanoTxHash, new Error("Temporary note storage failure."));
  const retry = await ledger.retrySavingNote(activity.id, walletAddress);
  const storedActivity = await repository.getActivityById(activity.id);

  assert.equal(retry.retried, true);
  assert.equal(repository.saveAttempts, 2);
  assert.equal(repository.blocks.length, 1);
  assert.equal(repository.activity.length, 1);
  assert.equal(storedActivity.noteSaveStatus, "Saved");
  assert.equal(transactionSubmissions, 0);
});

test("keeps stored note hashes stable when the latest Cardano block changes", async () => {
  let currentLatestBlock = latestBlock;
  const repository = new MemoryNotesRepository();
  const ledger = new NotesLedger({
    client: {
      network: "preprod",
      isConfigured: () => true,
      getLatestBlock: async () => currentLatestBlock,
    },
    logger: {
      logBlockTransaction() {},
      logNoteTransaction() {},
    },
    logWalletUtxosAfterTransaction: async () => {},
    repository,
  });
  const created = await ledger.addNote({
    author: "Ada",
    title: "Stable history",
    tag: "Work",
    content: "Do not rebuild from the chain tip.",
  });
  const originalHash = created.block.hash;
  const originalAnchorHash = created.block.anchor.blockHash;

  currentLatestBlock = {
    ...latestBlock,
    hash: "9".repeat(64),
    height: latestBlock.height + 100,
    slot: latestBlock.slot + 1000,
  };
  const state = await ledger.getState();

  assert.equal(state.chain[0].hash, originalHash);
  assert.equal(state.chain[0].anchor.blockHash, originalAnchorHash);
  assert.notEqual(state.latestBlock.hash, state.chain[0].anchor.blockHash);
});
