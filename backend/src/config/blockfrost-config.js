const BLOCKFROST_ENDPOINTS = {
  mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
  preprod: "https://cardano-preprod.blockfrost.io/api/v0",
  preview: "https://cardano-preview.blockfrost.io/api/v0",
};

function deriveNetworkFromProjectId(projectId) {
  if (!projectId) {
    return "";
  }

  const tokenPrefix = projectId.split("_")[0].toLowerCase();

  return BLOCKFROST_ENDPOINTS[tokenPrefix] ? tokenPrefix : "";
}

function createBlockfrostConfig(env = process.env) {
  const projectId = env.BLOCKFROST_PROJECT_ID;
  const derivedNetwork = deriveNetworkFromProjectId(projectId);
  const network = (env.BLOCKFROST_NETWORK || derivedNetwork || "preprod").toLowerCase();

  if (!BLOCKFROST_ENDPOINTS[network]) {
    throw new Error(
      `Unsupported BLOCKFROST_NETWORK "${network}". Use mainnet, preprod, or preview.`
    );
  }

  return {
    network,
    projectId,
    projectNetwork: derivedNetwork,
    apiUrl: env.BLOCKFROST_API_URL || BLOCKFROST_ENDPOINTS[network],
  };
}

module.exports = {
  BLOCKFROST_ENDPOINTS,
  createBlockfrostConfig,
  deriveNetworkFromProjectId,
};
