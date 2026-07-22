import NoteForm from "../components/NoteForm";
import NotesList from "../components/NotesList";
import Sidebar from "../components/Sidebar";
import TransactionHistoryPage from "../../transactions/pages/TransactionHistoryPage";
import { useNotes } from "../hooks/useNotes";
import { useWalletAuth } from "../../wallet/hooks/useWalletAuth";

export default function NotesPage() {
  const walletAuth = useWalletAuth();
  const notes = useNotes({
    walletAddress: walletAuth.connectedWallet?.address,
    publishNoteProof: walletAuth.publishNoteProof,
  });

  return (
    <div style={{ display: "flex" }}>
      <Sidebar
        activeTab={notes.activeTab}
        counts={notes.counts}
        onNewNote={notes.openNewNote}
        onTabSelect={notes.setActiveTab}
        walletAuth={walletAuth}
        transactionCount={notes.activity.length}
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
        ) : notes.activeTab === "transactions" ? (
          <TransactionHistoryPage
            activity={notes.activity}
            error={notes.activityError}
            walletAuth={walletAuth}
          />
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
          walletAuth={walletAuth}
        />
      )}
    </div>
  );
}
