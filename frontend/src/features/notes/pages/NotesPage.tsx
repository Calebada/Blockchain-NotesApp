import NoteForm from "../components/NoteForm";
import NotesList from "../components/NotesList";
import Sidebar from "../components/Sidebar";
import { useNotes } from "../hooks/useNotes";

export default function NotesPage() {
  const notes = useNotes();

  return (
    <div style={{ display: "flex" }}>
      <Sidebar
        activeTab={notes.activeTab}
        counts={notes.counts}
        onNewNote={notes.openNewNote}
        onTabSelect={notes.setActiveTab}
      />

      <main style={{ flex: 1 }}>
        {notes.globalError && (
          <div
            role="alert"
            style={{
              padding: "16px 56px",
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontWeight: 500,
            }}
          >
            {notes.globalError}
          </div>
        )}

        {notes.isLoading ? (
          <div
            style={{
              marginLeft: "260px",
              padding: "64px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Loading notes...
          </div>
        ) : (
          <NotesList
            title={notes.title}
            notes={notes.filteredNotes}
            isTrash={notes.activeTab === "trash"}
            onSearch={notes.setSearchQuery}
            onNewNote={notes.openNewNote}
            onEditNote={notes.openEditNote}
            onDeleteNote={notes.moveNoteToTrash}
            onRestoreNote={notes.restoreDeletedNote}
            onHardDeleteNote={notes.permanentlyDeleteNote}
            onTogglePin={notes.togglePinnedNote}
            walletTransactions={notes.walletTransactions}
            isWalletLoading={notes.isWalletLoading}
            walletError={notes.walletError}
            onRefreshWallet={() => notes.refreshWalletTransactions()}
          />
        )}
      </main>

      {notes.isModalOpen && (
        <NoteForm
          initialValues={notes.editingNote}
          isSubmitting={notes.isSubmitting}
          error={notes.modalError}
          onSave={notes.saveNote}
          onClose={notes.closeModal}
        />
      )}
    </div>
  );
}
