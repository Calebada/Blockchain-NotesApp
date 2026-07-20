const LOVELACES_PER_ADA = 1_000_000n;

function truncateHash(hash, prefixLength = 8, suffixLength = 7) {
  if (!hash || hash.length <= prefixLength + suffixLength + 3) {
    return hash;
  }

  return `${hash.slice(0, prefixLength)}...${hash.slice(-suffixLength)}`;
}

function findLovelaceQuantity(utxo) {
  const lovelaceAsset = (utxo.amount || []).find((asset) => asset.unit === "lovelace");

  return BigInt(lovelaceAsset?.quantity || "0");
}

function formatLovelaceToAda(quantity, decimals = 6) {
  const lovelaces = BigInt(quantity);
  const decimalFactor = 10n ** BigInt(decimals);
  const roundedAdaUnits = (lovelaces * decimalFactor + LOVELACES_PER_ADA / 2n) / LOVELACES_PER_ADA;
  const wholeAda = roundedAdaUnits / decimalFactor;
  const fractionalAda = (roundedAdaUnits % decimalFactor).toString().padStart(decimals, "0");

  return `${wholeAda}.${fractionalAda}`;
}

function parseWalletUtxos(rawUtxos) {
  return rawUtxos.map((utxo, index) => {
    const lovelaces = findLovelaceQuantity(utxo);

    return {
      "#": index + 1,
      "Tx Hash": truncateHash(utxo.tx_hash),
      "Output Index": utxo.output_index,
      "ADA": formatLovelaceToAda(lovelaces),
      "Assets": (utxo.amount || []).length,
    };
  });
}

function calculateTotalLovelaces(rawUtxos) {
  return rawUtxos.reduce((sum, utxo) => {
    return sum + findLovelaceQuantity(utxo);
  }, 0n);
}

async function logWalletUtxosAfterTransaction(blockfrostClient, walletAddress = blockfrostClient.walletAddress) {
  if (!walletAddress) {
    console.warn(
      "Wallet UTXO lookup skipped: CARDANO_BACKEND_WALLET_ADDRESS is not configured."
    );
    return;
  }

  const rawUtxos = await blockfrostClient.getAddressUtxos(walletAddress);
  const parsedUtxos = parseWalletUtxos(rawUtxos);
  const totalLovelaces = calculateTotalLovelaces(rawUtxos);

  console.info("Wallet Live UTXOs");
  console.table(parsedUtxos);
  console.info(`Total Wallet Funds Available: ${formatLovelaceToAda(totalLovelaces, 2)} ADA`);
}

module.exports = {
  calculateTotalLovelaces,
  formatLovelaceToAda,
  logWalletUtxosAfterTransaction,
  parseWalletUtxos,
  truncateHash,
};
