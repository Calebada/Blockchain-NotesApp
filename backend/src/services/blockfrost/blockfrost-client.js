const {
  BlockFrostAPI,
  BlockfrostClientError,
  BlockfrostServerError,
} = require("@blockfrost/blockfrost-js");
const { AppError } = require("../../common/app-error");
const { createBlockfrostConfig } = require("../../config/blockfrost-config");

class BlockfrostClient {
  constructor(config = createBlockfrostConfig()) {
    this.network = config.network;
    this.projectId = config.projectId;
    this.projectNetwork = config.projectNetwork;
    this.api = this.projectId
      ? new BlockFrostAPI({
          projectId: this.projectId,
          network: this.network,
          ...(config.customBackend ? { customBackend: config.customBackend } : {}),
        })
      : null;
  }

  isConfigured() {
    return Boolean(this.projectId);
  }

  assertConfigured() {
    if (!this.projectId) {
      throw new AppError(
        "BLOCKFROST_PROJECT_ID is required. Create a Blockfrost project and add its project_id to backend/.env.",
        503
      );
    }
  }

  normalizeSdkError(error) {
    if (error instanceof BlockfrostServerError) {
      error.statusCode = error.status_code;
      const mismatchHint =
        this.projectNetwork && this.projectNetwork !== this.network
          ? ` Set BLOCKFROST_NETWORK to "${this.projectNetwork}" or use a ${this.network} project_id.`
          : "";

      if (mismatchHint && !error.message.includes(mismatchHint.trim())) {
        error.message += mismatchHint;
      }
    } else if (error instanceof BlockfrostClientError) {
      error.statusCode = 502;
    }

    return error;
  }

  async getLatestBlock() {
    this.assertConfigured();

    try {
      return await this.api.blocksLatest();
    } catch (error) {
      throw this.normalizeSdkError(error);
    }
  }
}

module.exports = {
  BlockfrostClient,
};
