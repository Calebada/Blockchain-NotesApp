const assert = require("node:assert/strict");
const test = require("node:test");
const {
  calculateTotalLovelaces,
  formatLovelaceToAda,
  parseWalletUtxos,
  truncateHash,
} = require("../src/services/blockfrost/wallet-utxos");

test("formats wallet UTXOs for console output", () => {
  const rawUtxos = [
    {
      tx_hash: "6196f366111111111111111111111111111111111111111111111111fa8458c",
      output_index: 0,
      amount: [{ unit: "lovelace", quantity: "2500000" }],
    },
    {
      tx_hash: "abc",
      output_index: 1,
      amount: [
        { unit: "lovelace", quantity: "1000000" },
        { unit: "policyidasset", quantity: "4" },
      ],
    },
  ];

  assert.deepEqual(parseWalletUtxos(rawUtxos), [
    {
      "#": 1,
      "Tx Hash": "6196f366...fa8458c",
      "Output Index": 0,
      "ADA": "2.500000",
      "Assets": 1,
    },
    {
      "#": 2,
      "Tx Hash": "abc",
      "Output Index": 1,
      "ADA": "1.000000",
      "Assets": 2,
    },
  ]);
  assert.equal(calculateTotalLovelaces(rawUtxos), 3_500_000n);
});

test("formats lovelaces as ADA without floating point drift", () => {
  assert.equal(formatLovelaceToAda("1234567"), "1.234567");
  assert.equal(formatLovelaceToAda("1234567", 2), "1.23");
  assert.equal(formatLovelaceToAda("1235000", 2), "1.24");
  assert.equal(truncateHash("1234567890abcdef"), "1234567890abcdef");
});
