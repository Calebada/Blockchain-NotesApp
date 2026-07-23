import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CardanoWalletProvider,
  CardanoWindow,
  ConnectedWallet,
  WalletOption,
} from "../../../types/cardano-wallet";
import type { BlockchainProof, NoteTransactionIntent } from "../../../types/blockchain";
import {
  prepareNoteTransaction,
  submitNoteTransaction,
} from "../../notes/services/notes-api";

const CONNECTED_WALLET_STORAGE_KEY = "notetify.connectedWalletId";
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

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

  const publishNoteProof = useCallback(
    async (intent: NoteTransactionIntent): Promise<BlockchainProof> => {
      if (!connectedWallet) {
        throw new Error("Connect your Preprod wallet before saving this note.");
      }

      const provider = getWalletProvider(connectedWallet.id);

      if (!provider) {
        throw new Error("The connected wallet is no longer available in this browser.");
      }

      const api = await provider.enable();
      const utxos = (await api.getUtxos()) || [];
      const changeAddress = await api.getChangeAddress();
      const prepared = await prepareNoteTransaction({
        ...intent,
        walletAddress: connectedWallet.address,
        utxos,
        changeAddress,
      });
      const witnessSet = await api.signTx(prepared.unsignedTx, true);
      const submitted = await submitNoteTransaction(prepared, witnessSet);

      return {
        ...submitted,
        proofHash: prepared.proofHash,
        proofPayload: prepared.proofPayload,
        validUntilSlot: prepared.validUntilSlot,
      };
    },
    [connectedWallet]
  );

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
      publishNoteProof,
      refreshWallets,
      walletAuthError,
      wallets,
    }),
    [
      connectedWallet,
      connectWallet,
      disconnectWallet,
      isConnectingWallet,
      publishNoteProof,
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
    return normalizeCardanoAddress(usedAddresses[0]);
  }

  return normalizeCardanoAddress(await api.getChangeAddress());
}

function normalizeCardanoAddress(address: string) {
  const trimmedAddress = address.trim();

  if (!isHexAddress(trimmedAddress)) {
    return trimmedAddress;
  }

  return encodeCardanoAddressHex(trimmedAddress);
}

function isHexAddress(address: string) {
  return address.length > 0 && address.length % 2 === 0 && /^[0-9a-f]+$/i.test(address);
}

function encodeCardanoAddressHex(addressHex: string) {
  const addressBytes = hexToBytes(addressHex);
  const networkId = addressBytes[0] & 0x0f;
  const humanReadablePart = networkId === 1 ? "addr" : "addr_test";

  return encodeBech32(humanReadablePart, addressBytes);
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function encodeBech32(humanReadablePart: string, bytes: Uint8Array) {
  const data = convertBits([...bytes], 8, 5, true);
  const checksum = createBech32Checksum(humanReadablePart, data);

  return `${humanReadablePart}1${[...data, ...checksum]
    .map((value) => BECH32_CHARSET[value])
    .join("")}`;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean) {
  const converted: number[] = [];
  let accumulator = 0;
  let bitCount = 0;
  const maxValue = (1 << toBits) - 1;

  data.forEach((value) => {
    accumulator = (accumulator << fromBits) | value;
    bitCount += fromBits;

    while (bitCount >= toBits) {
      bitCount -= toBits;
      converted.push((accumulator >> bitCount) & maxValue);
    }
  });

  if (pad && bitCount > 0) {
    converted.push((accumulator << (toBits - bitCount)) & maxValue);
  }

  return converted;
}

function createBech32Checksum(humanReadablePart: string, data: number[]) {
  const values = [
    ...expandBech32HumanReadablePart(humanReadablePart),
    ...data,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  const polymod = calculateBech32Polymod(values) ^ 1;

  return Array.from({ length: 6 }, (_, index) => (polymod >> (5 * (5 - index))) & 31);
}

function expandBech32HumanReadablePart(humanReadablePart: string) {
  return [
    ...[...humanReadablePart].map((character) => character.charCodeAt(0) >> 5),
    0,
    ...[...humanReadablePart].map((character) => character.charCodeAt(0) & 31),
  ];
}

function calculateBech32Polymod(values: number[]) {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;

  values.forEach((value) => {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;

    generators.forEach((generator, index) => {
      if ((top >> index) & 1) {
        checksum ^= generator;
      }
    });
  });

  return checksum;
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
