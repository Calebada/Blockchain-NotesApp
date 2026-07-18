const { createBlockfrostConfig } = require("../config/blockfrost-config");

class BlockfrostClient {
  constructor(config = createBlockfrostConfig()) {
    this.network = config.network;
    this.projectId = config.projectId;
    this.projectNetwork = config.projectNetwork;
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
  }

  isConfigured() {
    return Boolean(this.projectId);
  }

  async request(path) {
    if (!this.projectId) {
      const error = new Error(
        "BLOCKFROST_PROJECT_ID is required. Create a Blockfrost project and add its project_id to backend/.env."
      );
      error.statusCode = 503;
      throw error;
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      headers: {
        project_id: this.projectId,
      },
    });

    if (!response.ok) {
      const details = await this.getErrorDetails(response);
      const mismatchHint =
        this.projectNetwork && this.projectNetwork !== this.network
          ? ` Set BLOCKFROST_NETWORK to "${this.projectNetwork}" or use a ${this.network} project_id.`
          : "";
      const error = new Error(`Blockfrost request failed: ${details}${mismatchHint}`);
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  async getErrorDetails(response) {
    try {
      const body = await response.json();
      return body.message || body.error || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  async getLatestBlock() {
    return this.request("/blocks/latest");
  }
}

module.exports = {
  BlockfrostClient,
};
