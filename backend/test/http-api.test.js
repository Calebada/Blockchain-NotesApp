const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");

function createNotesLedgerStub() {
  const ledger = {
    requestedWalletAddress: undefined,
    mutationWalletAddresses: [],
    mutationOptions: [],
    provider: {
      name: "blockfrost",
      network: "preprod",
      configured: true,
    },
    getState: async () => ({ valid: true, length: 0, chain: [] }),
    getTrashState: async () => ({ valid: true, length: 0, chain: [] }),
    getActivity: async (walletAddress) => ({
      network: "preprod",
      walletAddress,
      activity: [
        {
          id: "1",
          action: "CREATE_NOTE",
          walletAddress: "addr_test_connected_wallet",
          noteId: "1",
          noteTitle: "Wallet test",
          noteTag: "General",
          proofHash: "c".repeat(64),
          cardanoTxHash: "e".repeat(64),
          confirmationStatus: "Confirmed",
          cardanoBlockHash: "d".repeat(64),
          cardanoBlockHeight: 123456,
          validUntilSlot: 123999,
          confirmedAt: "2026-07-21T00:01:00.000Z",
          network: "preprod",
          createdAt: "2026-07-21T00:00:00.000Z",
        },
      ],
    }),
    addNote: async (_note, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);
      ledger.mutationOptions.push(options);

      return { block: { id: "1", note: _note }, valid: true };
    },
    updateNote: async (_id, _note, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);
      ledger.mutationOptions.push(options);

      return { block: { id: _id, note: _note }, valid: true };
    },
    restoreNote: async (_id, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);
      ledger.mutationOptions.push(options);

      return { block: { id: _id }, valid: true };
    },
    deleteNote: async (_id, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);
      ledger.mutationOptions.push(options);

      return { valid: true };
    },
    hardDeleteNote: async (_id, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);
      ledger.mutationOptions.push(options);

      return { valid: true };
    },
    getWalletTransactions: async (walletAddress) => {
      ledger.requestedWalletAddress = walletAddress;

      if (!walletAddress) {
        return {
          configured: false,
          walletAddress: "",
          totalAda: "0.000000",
          transactionCount: 0,
          transactions: [],
        };
      }

      return {
        configured: true,
        walletAddress,
        totalAda: "2.500000",
        transactionCount: 1,
        transactions: [{ txHash: "abc", outputIndex: 0, ada: "2.500000" }],
      };
    },
  };

  return ledger;
}

async function withServer(
  run,
  notesLedger = createNotesLedgerStub(),
  noteTransactionService = {
    prepare: async () => ({ unsignedTx: "00", proofHash: "a".repeat(64) }),
    submit: async () => ({ cardanoTxHash: "b".repeat(64), confirmationStatus: "Pending" }),
  }
) {
  const { app } = createApp({ notesLedger, noteTransactionService });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("returns health through the HTTP controller", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.provider.network, "preprod");
  });
});

test("centralizes payload validation errors", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Note content is required.");
  });
});

test("returns a disconnected wallet state without a connected wallet address", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/wallet/transactions`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.configured, false);
    assert.equal(body.walletAddress, "");
    assert.equal(body.totalAda, "0.000000");
    assert.deepEqual(body.transactions, []);
  });
});

test("passes a connected wallet address to wallet transaction lookup", async () => {
  const notesLedger = createNotesLedgerStub();

  await withServer(async (baseUrl) => {
    const walletAddress = "addr_test_connected_wallet";
    const response = await fetch(
      `${baseUrl}/api/wallet/transactions?walletAddress=${encodeURIComponent(walletAddress)}`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(notesLedger.requestedWalletAddress, walletAddress);
    assert.equal(body.walletAddress, walletAddress);
  }, notesLedger);
});

test("returns tracked note activity through the HTTP controller", async () => {
  const notesLedger = createNotesLedgerStub();

  await withServer(async (baseUrl) => {
    const walletAddress = "addr_test_connected_wallet";
    const response = await fetch(
      `${baseUrl}/api/activity?walletAddress=${encodeURIComponent(walletAddress)}`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.walletAddress, walletAddress);
    assert.equal(body.activity[0].action, "CREATE_NOTE");
    assert.equal(body.activity[0].walletAddress, "addr_test_connected_wallet");
    assert.equal(body.activity[0].proofHash, "c".repeat(64));
    assert.equal(body.activity[0].cardanoTxHash, "e".repeat(64));
    assert.equal(body.activity[0].confirmationStatus, "Confirmed");
    assert.equal(body.activity[0].cardanoBlockHash, "d".repeat(64));
    assert.equal(body.activity[0].cardanoBlockHeight, 123456);
  }, notesLedger);
});

test("passes the connected wallet address through note mutations", async () => {
  const notesLedger = createNotesLedgerStub();

  await withServer(async (baseUrl) => {
    const walletAddress = "addr_test_connected_wallet";
    const headers = { "content-type": "application/json" };
    const body = JSON.stringify({
      author: walletAddress,
      title: "Wallet test",
      tag: "General",
      content: "Testing connected wallet UTXOs.",
      walletAddress,
      proofHash: "a".repeat(64),
      cardanoTxHash: "b".repeat(64),
      confirmationStatus: "Pending",
      validUntilSlot: 999999,
    });

    const createResponse = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers,
      body,
    });
    const updateResponse = await fetch(`${baseUrl}/api/notes/1`, {
      method: "PUT",
      headers,
      body,
    });
    const restoreResponse = await fetch(`${baseUrl}/api/notes/1/restore`, {
      method: "POST",
      headers,
      body,
    });
    const deleteResponse = await fetch(`${baseUrl}/api/notes/1`, {
      method: "DELETE",
      headers,
      body,
    });
    const hardDeleteResponse = await fetch(`${baseUrl}/api/notes/1/permanent`, {
      method: "DELETE",
      headers,
      body,
    });

    assert.equal(createResponse.status, 201);
    assert.equal(updateResponse.status, 200);
    assert.equal(restoreResponse.status, 200);
    assert.equal(deleteResponse.status, 200);
    assert.equal(hardDeleteResponse.status, 200);
    assert.deepEqual(notesLedger.mutationWalletAddresses, [
      walletAddress,
      walletAddress,
      walletAddress,
      walletAddress,
      walletAddress,
    ]);
    assert.ok(
      notesLedger.mutationOptions.every(
        (options) =>
          options.proofHash === "a".repeat(64) &&
          options.cardanoTxHash === "b".repeat(64) &&
          options.confirmationStatus === "Pending" &&
          options.validUntilSlot === 999999
      )
    );
  }, notesLedger);
});

test("prepares and submits wallet-signed Preprod transactions", async () => {
  const calls = [];
  const noteTransactionService = {
    prepare: async (payload) => {
      calls.push(["prepare", payload]);
      return {
        unsignedTx: "00",
        proofHash: "a".repeat(64),
        validUntilSlot: 1234,
        network: "preprod",
      };
    },
    submit: async (payload) => {
      calls.push(["submit", payload]);
      return {
        cardanoTxHash: "b".repeat(64),
        confirmationStatus: "Pending",
        network: "preprod",
      };
    },
  };

  await withServer(async (baseUrl) => {
    const headers = { "content-type": "application/json" };
    const prepareResponse = await fetch(`${baseUrl}/api/transactions/prepare`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "CREATE_NOTE", utxos: ["abcd"] }),
    });
    const submitResponse = await fetch(`${baseUrl}/api/transactions/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({ unsignedTx: "00", witnessSet: "a0" }),
    });

    assert.equal(prepareResponse.status, 200);
    assert.equal((await prepareResponse.json()).network, "preprod");
    assert.equal(submitResponse.status, 202);
    assert.equal((await submitResponse.json()).cardanoTxHash, "b".repeat(64));
    assert.deepEqual(calls, [
      ["prepare", { action: "CREATE_NOTE", utxos: ["abcd"] }],
      ["submit", { unsignedTx: "00", witnessSet: "a0" }],
    ]);
  }, createNotesLedgerStub(), noteTransactionService);
});

test("returns a centralized 404 response for unknown routes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.match(body.error, /Route not found/);
  });
});
