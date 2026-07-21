const assert = require("node:assert/strict");
const test = require("node:test");
const { BlockfrostClient } = require("../src/services/blockfrost/blockfrost-client");

test("fetches address UTXOs through the Blockfrost SDK instance", async () => {
  const client = new BlockfrostClient({
    projectId: "preprod_test_project",
    network: "preprod",
    walletAddress: "addr_test_backend_wallet",
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

  const utxos = await client.getAddressUtxos();

  assert.equal(requestedAddress, "addr_test_backend_wallet");
  assert.deepEqual(utxos, expectedUtxos);
});
