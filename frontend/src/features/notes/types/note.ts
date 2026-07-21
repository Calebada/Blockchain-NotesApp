export const NOTE_TAG_OPTIONS = ["General", "Work", "Personal", "Ideas"] as const;

export type NoteTag = (typeof NOTE_TAG_OPTIONS)[number];

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
  cardanoTxHash: string;
  confirmationStatus: "Pending";
  validUntilSlot: number;
} & NoteContent;

export type UpdateNoteRequest = CreateNoteRequest & {
  id: string;
};
