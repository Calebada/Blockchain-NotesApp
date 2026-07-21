export type CardanoWalletApi = {
  getUtxos: () => Promise<string[] | null>;
  getUsedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getRewardAddresses?: () => Promise<string[]>;
  signTx: (transaction: string, partialSign?: boolean) => Promise<string>;
};

export type CardanoWalletProvider = {
  name?: string;
  icon?: string;
  apiVersion?: string;
  enable: () => Promise<CardanoWalletApi>;
  isEnabled?: () => Promise<boolean>;
};

export type CardanoWindow = Window & {
  cardano?: Record<string, CardanoWalletProvider | unknown>;
};

export type WalletOption = {
  id: string;
  name: string;
  icon?: string;
  apiVersion?: string;
};

export type ConnectedWallet = WalletOption & {
  address: string;
};
