const assert = require("node:assert/strict");
const test = require("node:test");
const { BlockfrostClient } = require("../src/services/blockfrost/blockfrost-client");

test("fetches address UTXOs through the Blockfrost SDK instance", async () => {
  const client = new BlockfrostClient({
    projectId: "preprod_test_project",
    network: "preprod",
  });
  let requestedAddress = "";
  const expectedUtxos = [
    {
      tx_hash: "6196f366",
      output_index: 0,
      amount: [{ unit: "lovelace", quantity: "1000000" }],
    },
  ];

  client.api = {
    addressesUtxos: async (walletAddress) => {
      requestedAddress = walletAddress;
      return expectedUtxos;
    },
  };

  const utxos = await client.getAddressUtxos("addr_test_connected_wallet");

  assert.equal(requestedAddress, "addr_test_connected_wallet");
  assert.deepEqual(utxos, expectedUtxos);
});

test("requires a connected wallet address for UTXO lookup", async () => {
  const client = new BlockfrostClient({
    projectId: "preprod_test_project",
    network: "preprod",
  });

  await assert.rejects(
    () => client.getAddressUtxos(),
    (error) =>
      error.statusCode === 400 &&
      error.message === "A connected Cardano wallet address is required."
  );
});

test("treats a wallet address with no known UTXOs as an empty wallet", async () => {
  const client = new BlockfrostClient({
    projectId: "preprod_test_project",
    network: "preprod",
  });

  client.api = {
    addressesUtxos: async () => {
      const error = new Error("The requested component has not been found.");
      error.statusCode = 404;
      throw error;
    },
  };

  assert.deepEqual(await client.getAddressUtxos("addr_test_empty_wallet"), []);
});
