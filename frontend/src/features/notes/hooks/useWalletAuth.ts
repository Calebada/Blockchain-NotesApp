import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CardanoWalletProvider,
  CardanoWindow,
  ConnectedWallet,
  WalletOption,
} from "../../../types/cardano-wallet";

const CONNECTED_WALLET_STORAGE_KEY = "notetify.connectedWalletId";

export function useWalletAuth() {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletAuthError, setWalletAuthError] = useState("");

  const refreshWallets = useCallback(() => {
    const detectedWallets = getInstalledWallets();
    setWallets(detectedWallets);
    return detectedWallets;
  }, []);

  const connectWallet = useCallback(
    async (walletId?: string) => {
      setIsConnectingWallet(true);
      setWalletAuthError("");

      try {
        const detectedWallets = refreshWallets();
        const selectedWalletId = walletId || detectedWallets[0]?.id;

        if (!selectedWalletId) {
          throw new Error("No Cardano browser wallet was found. Install Nami, Eternl, Lace, or another CIP-30 wallet.");
        }

        const provider = getWalletProvider(selectedWalletId);

        if (!provider) {
          throw new Error("That wallet is no longer available in this browser.");
        }

        const api = await provider.enable();
        const address = await readWalletAddress(api);
        const walletInfo = toWalletOption(selectedWalletId, provider);

        const nextWallet = {
          ...walletInfo,
          address,
        };

        setConnectedWallet(nextWallet);
        window.localStorage.setItem(CONNECTED_WALLET_STORAGE_KEY, selectedWalletId);
        return nextWallet;
      } catch (error) {
        const message = getWalletConnectionError(error);
        setWalletAuthError(message);
        setConnectedWallet(null);
        throw error;
      } finally {
        setIsConnectingWallet(false);
      }
    },
    [refreshWallets]
  );

  const disconnectWallet = useCallback(() => {
    setConnectedWallet(null);
    setWalletAuthError("");
    window.localStorage.removeItem(CONNECTED_WALLET_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const detectedWallets = refreshWallets();
    const storedWalletId = window.localStorage.getItem(CONNECTED_WALLET_STORAGE_KEY);

    if (!storedWalletId || !detectedWallets.some((wallet) => wallet.id === storedWalletId)) {
      return;
    }

    const provider = getWalletProvider(storedWalletId);

    if (!provider?.isEnabled) {
      return;
    }

    void provider.isEnabled().then((isEnabled) => {
      if (isEnabled) {
        void connectWallet(storedWalletId).catch(() => {
          window.localStorage.removeItem(CONNECTED_WALLET_STORAGE_KEY);
        });
      }
    });
  }, [connectWallet, refreshWallets]);

  useEffect(() => {
    const detectionTimer = window.setTimeout(refreshWallets, 500);
    return () => window.clearTimeout(detectionTimer);
  }, [refreshWallets]);

  return useMemo(
    () => ({
      connectedWallet,
      connectWallet,
      disconnectWallet,
      isConnectingWallet,
      isWalletConnected: Boolean(connectedWallet),
      refreshWallets,
      walletAuthError,
      wallets,
    }),
    [
      connectedWallet,
      connectWallet,
      disconnectWallet,
      isConnectingWallet,
      refreshWallets,
      walletAuthError,
      wallets,
    ]
  );
}

export type WalletAuthState = ReturnType<typeof useWalletAuth>;

function getInstalledWallets() {
  const cardano = (window as CardanoWindow).cardano;

  if (!cardano) {
    return [];
  }

  const installedWallets: WalletOption[] = [];

  Object.entries(cardano).forEach(([id, provider]) => {
    if (isWalletProvider(provider)) {
      installedWallets.push(toWalletOption(id, provider));
    }
  });

  return installedWallets.sort((left, right) => left.name.localeCompare(right.name));
}

function getWalletProvider(walletId: string) {
  const provider = (window as CardanoWindow).cardano?.[walletId];
  return isWalletProvider(provider) ? provider : null;
}

function isWalletProvider(provider: unknown): provider is CardanoWalletProvider {
  if (!provider || typeof provider !== "object") {
    return false;
  }

  return typeof (provider as Partial<CardanoWalletProvider>).enable === "function";
}

function toWalletOption(id: string, provider: CardanoWalletProvider): WalletOption {
  return {
    id,
    name: provider.name || formatWalletName(id),
    icon: provider.icon,
    apiVersion: provider.apiVersion,
  };
}

async function readWalletAddress(api: Awaited<ReturnType<CardanoWalletProvider["enable"]>>) {
  const usedAddresses = await api.getUsedAddresses();

  if (usedAddresses[0]) {
    return usedAddresses[0];
  }

  return api.getChangeAddress();
}

function formatWalletName(walletId: string) {
  return walletId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getWalletConnectionError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const walletError = error as {
      code?: unknown;
      info?: unknown;
      message?: unknown;
      name?: unknown;
    };

    const details = [walletError.info, walletError.message, walletError.name]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .join(" ");
    const normalizedDetails = details.toLowerCase();

    if (normalizedDetails.includes("dapp account")) {
      return "Eternl does not have a dApp account selected. Open Eternl, select your Notetify account, then set it as the dApp account.";
    }

    if (normalizedDetails.includes("denied") || normalizedDetails.includes("reject")) {
      return "Wallet connection was rejected. Try Connect wallet again and approve the Eternl prompt.";
    }

    if (typeof walletError.code === "number") {
      return `Wallet connection failed with code ${walletError.code}. Check Eternl and try connecting again.`;
    }
  }

  return "Wallet connection was rejected or could not be completed. Open Eternl, unlock your wallet, and make sure a dApp account is selected.";
}
