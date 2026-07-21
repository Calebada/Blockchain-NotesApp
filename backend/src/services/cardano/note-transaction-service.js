const crypto = require("crypto");
const Cardano = require("@emurgo/cardano-serialization-lib-nodejs");
const { AppError } = require("../../common/app-error");

const NOTE_METADATA_LABEL = "1968";
const NOTE_TRANSACTION_VERSION = 1;
const ALLOWED_ACTIONS = new Set([
  "CREATE_NOTE",
  "UPDATE_NOTE",
  "DELETE_NOTE",
  "RESTORE_NOTE",
  "PERMANENT_DELETE_NOTE",
]);

function normalizeIntent(intent = {}) {
  if (!ALLOWED_ACTIONS.has(intent.action)) {
    throw new AppError("A valid note action is required.", 400);
  }

  if (typeof intent.walletAddress !== "string" || !intent.walletAddress.trim()) {
    throw new AppError("A connected Cardano wallet address is required.", 400);
  }

  return {
    version: NOTE_TRANSACTION_VERSION,
    action: intent.action,
    walletAddress: intent.walletAddress.trim(),
    noteId: intent.noteId ? String(intent.noteId) : "",
    title: typeof intent.title === "string" ? intent.title : "",
    tag: typeof intent.tag === "string" ? intent.tag : "General",
    content: typeof intent.content === "string" ? intent.content : "",
  };
}

function createProofHash(intent) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizeIntent(intent)))
    .digest("hex");
}

function parseAddress(address) {
  try {
    if (/^[0-9a-f]+$/i.test(address) && address.length % 2 === 0) {
      return Cardano.Address.from_bytes(Buffer.from(address, "hex"));
    }

    return Cardano.Address.from_bech32(address);
  } catch (_error) {
    throw new AppError("The wallet returned an invalid change address.", 400);
  }
}

function toBigNum(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    throw new AppError(`Blockfrost did not return ${fieldName}.`, 502);
  }

  return Cardano.BigNum.from_str(String(value));
}

function createBuilderConfig(parameters) {
  return Cardano.TransactionBuilderConfigBuilder.new()
    .fee_algo(
      Cardano.LinearFee.new(
        toBigNum(parameters.min_fee_a, "min_fee_a"),
        toBigNum(parameters.min_fee_b, "min_fee_b")
      )
    )
    .coins_per_utxo_byte(
      toBigNum(
        parameters.coins_per_utxo_size || parameters.coins_per_utxo_word,
        "coins_per_utxo_size"
      )
    )
    .pool_deposit(toBigNum(parameters.pool_deposit, "pool_deposit"))
    .key_deposit(toBigNum(parameters.key_deposit, "key_deposit"))
    .max_value_size(Number(parameters.max_val_size))
    .max_tx_size(Number(parameters.max_tx_size))
    .build();
}

function parseWalletUtxos(utxoHexes) {
  if (!Array.isArray(utxoHexes) || utxoHexes.length === 0) {
    throw new AppError(
      "The connected Preprod wallet has no spendable UTXOs. Add test ADA and try again.",
      400
    );
  }

  const utxos = Cardano.TransactionUnspentOutputs.new();

  try {
    utxoHexes.forEach((utxoHex) => {
      utxos.add(Cardano.TransactionUnspentOutput.from_hex(utxoHex));
    });
  } catch (_error) {
    throw new AppError("The wallet returned an invalid UTXO.", 400);
  }

  return utxos;
}

function buildUnsignedTransaction({ intent, proofHash, utxos, changeAddress, parameters, latestBlock }) {
  const address = parseAddress(changeAddress);

  if (address.network_id() === 1) {
    throw new AppError("Connect a Cardano Preprod wallet, not a Mainnet wallet.", 400);
  }

  const builder = Cardano.TransactionBuilder.new(createBuilderConfig(parameters));

  builder.add_json_metadatum(
    Cardano.BigNum.from_str(NOTE_METADATA_LABEL),
    JSON.stringify({
      app: "Notetify",
      version: NOTE_TRANSACTION_VERSION,
      action: intent.action,
      proofHash,
    })
  );
  builder.add_output(
    Cardano.TransactionOutput.new(
      address,
      Cardano.Value.new(Cardano.BigNum.from_str("1000000"))
    )
  );
  builder.add_inputs_from(utxos, Cardano.CoinSelectionStrategyCIP2.LargestFirstMultiAsset);

  const validUntilSlot = Number(latestBlock.slot) + 3600;
  builder.set_ttl_bignum(Cardano.BigNum.from_str(String(validUntilSlot)));
  builder.add_change_if_needed(address);

  return {
    unsignedTx: builder.build_tx().to_hex(),
    validUntilSlot,
  };
}

class NoteTransactionService {
  constructor(client) {
    this.client = client;
  }

  assertPreprod() {
    if (this.client.network !== "preprod") {
      throw new AppError("On-chain note proofs are restricted to Cardano Preprod.", 503);
    }
  }

  async prepare(payload = {}) {
    this.assertPreprod();
    const intent = normalizeIntent(payload);
    const proofHash = createProofHash(intent);
    const [parameters, latestBlock] = await Promise.all([
      this.client.getLatestProtocolParameters(),
      this.client.getLatestBlock(),
    ]);
    const transaction = buildUnsignedTransaction({
      intent,
      proofHash,
      utxos: parseWalletUtxos(payload.utxos),
      changeAddress: payload.changeAddress,
      parameters,
      latestBlock,
    });

    return {
      ...transaction,
      proofHash,
      network: "preprod",
    };
  }

  async submit({ unsignedTx, witnessSet }) {
    this.assertPreprod();

    try {
      const unsignedTransaction = Cardano.Transaction.from_hex(unsignedTx);
      const walletWitnesses = Cardano.TransactionWitnessSet.from_hex(witnessSet);
      const signedTransaction = Cardano.Transaction.new(
        unsignedTransaction.body(),
        walletWitnesses,
        unsignedTransaction.auxiliary_data()
      );
      const cardanoTxHash = await this.client.submitTransaction(signedTransaction.to_hex());

      return {
        cardanoTxHash,
        confirmationStatus: "Pending",
        network: "preprod",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Unable to submit the signed Preprod transaction: ${error.message || "unknown error"}`,
        error.statusCode || 502
      );
    }
  }
}

module.exports = {
  NoteTransactionService,
  createProofHash,
};
