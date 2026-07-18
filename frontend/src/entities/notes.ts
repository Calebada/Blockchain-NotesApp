import type { ChainBlock, FrontendNote, NoteContent } from "../types/blockchain";

export const DEFAULT_NOTE_TAG = "General";

function normalizeTag(tag: unknown) {
  return typeof tag === "string" && tag.trim() ? tag.trim() : DEFAULT_NOTE_TAG;
}

function normalizeTitle(title: unknown) {
  return typeof title === "string" ? title.trim() : "";
}

export function parseNoteContent(rawContent: string): NoteContent {
  try {
    const parsed: unknown = JSON.parse(rawContent);

    if (parsed && typeof parsed === "object" && "content" in parsed) {
      const parsedContent = (parsed as { content?: unknown }).content;

      if (typeof parsedContent === "string") {
        return {
          title: normalizeTitle((parsed as { title?: unknown }).title),
          tag: normalizeTag((parsed as { tag?: unknown }).tag),
          content: parsedContent,
        };
      }
    }
  } catch {
    // Plain text notes are valid legacy note content.
  }

  return {
    title: "",
    tag: DEFAULT_NOTE_TAG,
    content: rawContent,
  };
}

export function serializeNoteContent(note: NoteContent) {
  return JSON.stringify({
    title: note.title.trim(),
    tag: normalizeTag(note.tag),
    content: note.content.trim(),
  });
}

export function toFrontendNote(block: ChainBlock, pinnedNoteIds: ReadonlySet<string>): FrontendNote {
  const noteContent = parseNoteContent(block.note.content);
  const pinKey = block.id || block.hash;

  return {
    id: block.id,
    pinKey,
    hash: block.hash,
    author: block.note.author,
    timestamp: block.timestamp,
    isPinned: pinnedNoteIds.has(pinKey),
    ...noteContent,
  };
}
