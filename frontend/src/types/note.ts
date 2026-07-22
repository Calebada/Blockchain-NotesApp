export const NOTE_TAG_OPTIONS = ["General", "Work", "Personal", "Ideas"] as const;

export type NoteTag = (typeof NOTE_TAG_OPTIONS)[number];
