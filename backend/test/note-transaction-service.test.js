const assert = require("node:assert/strict");
const test = require("node:test");
const Cardano = require("@emurgo/cardano-serialization-lib-nodejs");
const {
  NoteTransactionService,
  createProofHash,
} = require("../src/services/cardano/note-transaction-service");

const parameters = {
  min_fee_a: 44,
  min_fee_b: 155381,
  coins_per_utxo_size: "4310",
  pool_deposit: "500000000",
  key_deposit: "2000000",
  max_val_size: "5000",
  max_tx_size: 16384,
};

function createWalletFixture() {
  const credential = Cardano.Credential.from_keyhash(
    Cardano.Ed25519KeyHash.from_bytes(Buffer.alloc(28, 1))
  );
  const address = Cardano.EnterpriseAddress.new(0, credential).to_address();
  const input = Cardano.TransactionInput.new(
    Cardano.TransactionHash.from_bytes(Buffer.alloc(32, 2)),
    0
  );
  const output = Cardano.TransactionOutput.new(
    address,
    Cardano.Value.new(Cardano.BigNum.from_str("10000000"))
  );

  return {
    address,
    utxo: Cardano.TransactionUnspentOutput.new(input, output).to_hex(),
  };
}

test("builds a metadata-only Preprod proof transaction", async () => {
  const wallet = createWalletFixture();
  const service = new NoteTransactionService({
    network: "preprod",
    getLatestProtocolParameters: async () => parameters,
    getLatestBlock: async () => ({ slot: 1000 }),
  });
  const intent = {
    action: "CREATE_NOTE",
    walletAddress: addressForHash,
    title: "Private title",
    tag: "Work",
    content: "Private note content",
  };

  const prepared = await service.prepare({
    ...intent,
    utxos: [wallet.utxo],
    changeAddress: wallet.address.to_hex(),
  });
  const transaction = Cardano.Transaction.from_hex(prepared.unsignedTx);
  const metadata = transaction
    .auxiliary_data()
    .metadata()
    .get(Cardano.BigNum.from_str("1968"));
  const metadataJson = Cardano.decode_metadatum_to_json_str(
    metadata,
    Cardano.MetadataJsonSchema.NoConversions
  );

  assert.equal(prepared.network, "preprod");
  assert.equal(prepared.validUntilSlot, 4600);
  assert.equal(prepared.proofHash, createProofHash(intent));
  assert.match(metadataJson, /Notetify/);
  assert.match(metadataJson, new RegExp(prepared.proofHash));
  assert.doesNotMatch(metadataJson, /Private title|Private note content/);
});

test("assembles wallet witnesses and submits the signed transaction", async () => {
  const wallet = createWalletFixture();
  let submittedTransaction = "";
  const service = new NoteTransactionService({
    network: "preprod",
    getLatestProtocolParameters: async () => parameters,
    getLatestBlock: async () => ({ slot: 1000 }),
    submitTransaction: async (transactionHex) => {
      submittedTransaction = transactionHex;
      return "d".repeat(64);
    },
  });
  const prepared = await service.prepare({
    action: "DELETE_NOTE",
    walletAddress: addressForHash,
    noteId: "7",
    utxos: [wallet.utxo],
    changeAddress: wallet.address.to_hex(),
  });

  const result = await service.submit({
    unsignedTx: prepared.unsignedTx,
    witnessSet: Cardano.TransactionWitnessSet.new().to_hex(),
  });

  assert.equal(result.cardanoTxHash, "d".repeat(64));
  assert.equal(result.confirmationStatus, "Pending");
  assert.ok(Cardano.Transaction.from_hex(submittedTransaction).auxiliary_data());
});

const addressForHash = "addr_test1schoolprojectwallet";
