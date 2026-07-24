import NotesList from "../components/NotesList";
import type { FrontendNote } from "../types/note";

interface PinnedNotesPageProps {
  notes: FrontendNote[];
  onSearch: (query: string) => void;
  onNewNote: () => void;
  onEditNote: (id: string) => void;
  onDeleteNote: (id?: string) => void;
  onTogglePin: (id: string) => void;
}

export default function PinnedNotesPage({
  notes,
  onSearch,
  onNewNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
}: PinnedNotesPageProps) {
  return (
    <NotesList
      title="Pinned notes"
      notes={notes}
      onSearch={onSearch}
      onNewNote={onNewNote}
      onEditNote={onEditNote}
      onDeleteNote={onDeleteNote}
      onTogglePin={onTogglePin}
    />
  );
}
