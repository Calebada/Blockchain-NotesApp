const SUPPORTED_BLOCKFROST_NETWORKS = ["mainnet", "preprod", "preview"];

function deriveNetworkFromProjectId(projectId) {
  if (!projectId) {
    return "";
  }

  const tokenPrefix = projectId.split("_")[0].toLowerCase();

  return SUPPORTED_BLOCKFROST_NETWORKS.includes(tokenPrefix) ? tokenPrefix : "";
}

function createBlockfrostConfig(env = process.env) {
  const projectId = env.BLOCKFROST_PROJECT_ID;
  const projectNetwork = deriveNetworkFromProjectId(projectId);
  const network = (env.BLOCKFROST_NETWORK || projectNetwork || "preprod").toLowerCase();
  const customBackend = env.BLOCKFROST_API_URL?.replace(/\/$/, "");
  const walletAddress = env.CARDANO_BACKEND_WALLET_ADDRESS || "";

  if (!SUPPORTED_BLOCKFROST_NETWORKS.includes(network)) {
    throw new Error(
      `Unsupported BLOCKFROST_NETWORK "${network}". Use ${SUPPORTED_BLOCKFROST_NETWORKS.join(
        ", "
      )}.`
    );
  }

  return {
    network,
    projectId,
    projectNetwork,
    customBackend,
    walletAddress,
  };
}

module.exports = {
  SUPPORTED_BLOCKFROST_NETWORKS,
  createBlockfrostConfig,
  deriveNetworkFromProjectId,
};
