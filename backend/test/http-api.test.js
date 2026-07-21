const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");

function createNotesLedgerStub() {
  return {
    provider: {
      name: "blockfrost",
      network: "mainnet",
      configured: true,
    },
    getState: async () => ({ valid: true, length: 0, chain: [] }),
    getTrashState: async () => ({ valid: true, length: 0, chain: [] }),
    getWalletTransactions: async () => ({
      configured: true,
      walletAddress: "addr_test_wallet",
      totalAda: "2.500000",
      transactionCount: 1,
      transactions: [{ txHash: "abc", outputIndex: 0, ada: "2.500000" }],
    }),
  };
}

async function withServer(run) {
  const { app } = createApp({ notesLedger: createNotesLedgerStub() });
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

test("returns live wallet transactions through the HTTP controller", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/wallet/transactions`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.walletAddress, "addr_test_wallet");
    assert.equal(body.totalAda, "2.500000");
    assert.equal(body.transactions[0].txHash, "abc");
  });
});

test("returns a centralized 404 response for unknown routes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.match(body.error, /Route not found/);
  });
});
