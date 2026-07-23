import type { NoteTag } from "./note";

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
  proofHash: string;
  cardanoTxHash: string;
  confirmationStatus: "Pending" | "Confirmed" | "Failed";
  cardanoBlockHash: string;
  cardanoBlockHeight: number | null;
  cardanoBlockSlot: number | null;
  cardanoBlockEpoch: number | null;
  cardanoBlockTime: string | null;
  validUntilSlot: number | null;
  confirmedAt: string | null;
  proofPayload: NormalizedNoteProofIntent | null;
  noteSaveStatus: "Pending" | "Saved" | "Failed";
  noteSaveError: string;
  network: string;
  createdAt: string;
};

export type NoteTransactionIntent = {
  action: NoteActivityAction;
  noteId?: string;
  title?: string;
  tag?: string;
  content?: string;
};

export type NormalizedNoteProofIntent = {
  version: 1;
  action: NoteActivityAction;
  walletAddress: string;
  noteId: string;
  title: string;
  tag: string;
  content: string;
};

export type BlockchainProof = {
  proofHash: string;
  proofPayload: NormalizedNoteProofIntent;
  cardanoTxHash: string;
  confirmationStatus: "Pending";
  validUntilSlot: number;
  proofRecordId: string | null;
  proofPersistenceStatus: "Saved" | "Failed";
  warning: string;
};

export type PreparedNoteTransaction = {
  unsignedTx: string;
  proofHash: string;
  proofPayload: NormalizedNoteProofIntent;
  validUntilSlot: number;
  network: "preprod";
};

export type ProofVerificationResult = {
  verified: boolean;
  transactionExists: boolean;
  metadataMatches: boolean;
  actionMatches: boolean;
  message: string;
  block?: {
    hash: string;
    height: number | null;
    slot: number | null;
    epoch: number | null;
    time: string | null;
  };
};

export type NoteActivityResponse = {
  provider: BlockfrostProvider;
  network: string;
  walletAddress: string;
  activity: NoteActivity[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};
