export type LedgerNote = {
  author: string;
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

export type NoteContent = {
  title: string;
  tag: string;
  content: string;
};

export type NoteFormValues = NoteContent;

export type FrontendNote = NoteContent & {
  id?: string;
  pinKey: string;
  hash: string;
  author: string;
  timestamp: string;
  isPinned: boolean;
};

export type NoteCounts = {
  all: number;
  pinned: number;
  tags: Record<string, number>;
};

export type CreateNoteRequest = {
  author: string;
  content: string;
};

export type UpdateNoteRequest = CreateNoteRequest & {
  id: string;
};
