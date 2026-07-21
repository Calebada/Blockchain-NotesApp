const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");

function createNotesLedgerStub() {
  const ledger = {
    requestedWalletAddress: undefined,
    mutationWalletAddresses: [],
    provider: {
      name: "blockfrost",
      network: "mainnet",
      configured: true,
    },
    getState: async () => ({ valid: true, length: 0, chain: [] }),
    getTrashState: async () => ({ valid: true, length: 0, chain: [] }),
    getActivity: async (walletAddress) => ({
      network: "mainnet",
      walletAddress,
      activity: [
        {
          id: "1",
          action: "CREATE_NOTE",
          walletAddress: "addr_test_connected_wallet",
          noteId: "1",
          noteTitle: "Wallet test",
          noteTag: "General",
          network: "mainnet",
          createdAt: "2026-07-21T00:00:00.000Z",
        },
      ],
    }),
    addNote: async (_note, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);

      return { block: { id: "1", note: _note }, valid: true };
    },
    updateNote: async (_id, _note, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);

      return { block: { id: _id, note: _note }, valid: true };
    },
    restoreNote: async (_id, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);

      return { block: { id: _id }, valid: true };
    },
    deleteNote: async (_id, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);

      return { valid: true };
    },
    hardDeleteNote: async (_id, options = {}) => {
      ledger.mutationWalletAddresses.push(options.walletAddress);

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

async function withServer(run, notesLedger = createNotesLedgerStub()) {
  const { app } = createApp({ notesLedger });
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
    assert.equal(body.provider.network, "mainnet");
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
      body: JSON.stringify({ walletAddress }),
    });
    const deleteResponse = await fetch(`${baseUrl}/api/notes/1`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ walletAddress }),
    });
    const hardDeleteResponse = await fetch(`${baseUrl}/api/notes/1/permanent`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ walletAddress }),
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
  }, notesLedger);
});

test("returns a centralized 404 response for unknown routes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.match(body.error, /Route not found/);
  });
});
