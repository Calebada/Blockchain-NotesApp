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
