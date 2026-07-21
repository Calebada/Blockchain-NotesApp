import type { NoteTag } from "../features/notes/types/note";

export type LedgerNote = {
  author: string;
  title?: string;
  tag?: NoteTag;
  content: string;
  securedAt?: string;
};

export type StorageProvider = {
  name: string;
  table?: string;
  configured: boolean;
};

export type BlockfrostProvider = {
  name: string;
  network: string;
  configured: boolean;
  storage?: StorageProvider;
};

export type CardanoBlock = {
  hash: string;
  height: number;
  slot: number;
  epoch: number;
  txCount: number;
  time: string;
};

export type NoteAnchor = {
  provider: string;
  network: string;
  blockHash: string;
  blockHeight: number;
  slot: number;
  epoch: number;
  txCount: number;
  blockTime: string;
};

export type ChainBlock = {
  id?: string;
  index: number;
  timestamp: string;
  deletedAt?: string | null;
  note: LedgerNote;
  previousHash: string;
  hash: string;
  anchor: NoteAnchor;
};

export type ChainResponse = {
  valid: boolean;
  length: number;
  provider: BlockfrostProvider;
  latestBlock: CardanoBlock;
  chain: ChainBlock[];
};

export type WalletAsset = {
  unit: string;
  quantity: string;
};

export type WalletTransaction = {
  txHash: string;
  txHashShort: string;
  outputIndex: number;
  ada: string;
  lovelaces: string;
  assetCount: number;
  assets: WalletAsset[];
};

export type WalletTransactionsResponse = {
  provider: BlockfrostProvider;
  network: string;
  configured: boolean;
  walletAddress: string;
  fetchedAt: string;
  totalAda: string;
  totalLovelaces: string;
  transactionCount: number;
  transactions: WalletTransaction[];
};

export type NoteActivityAction =
  | "CREATE_NOTE"
  | "UPDATE_NOTE"
  | "DELETE_NOTE"
  | "RESTORE_NOTE"
  | "PERMANENT_DELETE_NOTE";

export type NoteActivity = {
  id: string;
  action: NoteActivityAction;
  walletAddress: string;
  noteId: string;
  noteTitle: string;
  noteTag: string;
  transactionId: string;
  cardanoBlockHash: string;
  cardanoBlockHeight: number | null;
  network: string;
  createdAt: string;
};

export type NoteActivityResponse = {
  provider: BlockfrostProvider;
  network: string;
  walletAddress: string;
  activity: NoteActivity[];
};
