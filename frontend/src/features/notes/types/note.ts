import type { NoteTag } from "../../../types/note";

export { NOTE_TAG_OPTIONS } from "../../../types/note";
export type { NoteTag } from "../../../types/note";

export type NoteContent = {
  title: string;
  tag: NoteTag;
  content: string;
};

export type NoteFormValues = NoteContent;

export type FrontendNote = NoteContent & {
  id?: string;
  pinKey: string;
  hash: string;
  author: string;
  timestamp: string;
  deletedAt?: string | null;
  isPinned: boolean;
};

export type NoteCounts = {
  all: number;
  pinned: number;
  trash: number;
  tags: Record<string, number>;
};

export type CreateNoteRequest = {
  author: string;
  walletAddress?: string | null;
  proofHash: string;
  proofPayload: import("../../../types/blockchain").NormalizedNoteProofIntent;
  cardanoTxHash: string;
  confirmationStatus: "Pending";
  validUntilSlot: number;
} & NoteContent;

export type UpdateNoteRequest = CreateNoteRequest & {
  id: string;
};
