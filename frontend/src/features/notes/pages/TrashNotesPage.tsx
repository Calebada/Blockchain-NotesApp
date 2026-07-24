import NotesList from "../components/NotesList";
import type { FrontendNote } from "../types/note";

interface TrashNotesPageProps {
  notes: FrontendNote[];
  onSearch: (query: string) => void;
  onNewNote: () => void;
  onEditNote: (id: string) => void;
  onRestoreNote: (id?: string) => void;
  onHardDeleteNote: (id?: string) => void;
  onTogglePin: (id: string) => void;
}

export default function TrashNotesPage({
  notes,
  onSearch,
  onNewNote,
  onEditNote,
  onRestoreNote,
  onHardDeleteNote,
  onTogglePin,
}: TrashNotesPageProps) {
  return (
    <NotesList
      title="Trash"
      notes={notes}
      isTrash
      onSearch={onSearch}
      onNewNote={onNewNote}
      onEditNote={onEditNote}
      onRestoreNote={onRestoreNote}
      onHardDeleteNote={onHardDeleteNote}
      onTogglePin={onTogglePin}
    />
  );
}
