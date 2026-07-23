import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
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
  const [toastMessage, setToastMessage] = useState("");
  const globalError =
    notes.globalError === disconnectedWalletMessage ? "" : notes.globalError;

  useEffect(() => {
    if (notes.globalError === disconnectedWalletMessage) {
      setToastMessage(disconnectedWalletMessage);
    }
  }, [notes.globalError]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const dismissTimer = window.setTimeout(() => setToastMessage(""), 3200);
    return () => window.clearTimeout(dismissTimer);
  }, [toastMessage]);

  return (
    <div style={{ display: "flex" }}>
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 1200,
            width: "min(360px, calc(100vw - 48px))",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            color: "#FFFFFF",
            backgroundColor: "#221811",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "13px 14px",
            boxShadow: "0 14px 32px rgba(0, 0, 0, 0.22)",
            fontSize: "13px",
            lineHeight: 1.45,
            fontWeight: 600,
          }}
        >
          <AlertCircle
            size={16}
            style={{
              color: "var(--accent-orange)",
              flex: "0 0 auto",
              marginTop: "1px",
            }}
          />
          <span>{toastMessage}</span>
        </div>
      )}

      <Sidebar
        activeTab={notes.activeTab}
        counts={notes.counts}
        onNewNote={notes.openNewNote}
        onTabSelect={notes.setActiveTab}
        walletAuth={walletAuth}
        transactionCount={notes.activityPagination.total}
      />

      <main style={{ flex: 1 }}>
        {notes.pendingNoteSave && (
          <div
            role="alert"
            style={{
              marginLeft: "260px",
              padding: "16px 56px",
              backgroundColor: "#FFF7ED",
              borderBottom: "1px solid #FDBA74",
              color: "#9A3412",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            <div>
              <strong>Blockchain transaction succeeded; note save failed.</strong>
              <div style={{ marginTop: "4px", fontSize: "12px", fontFamily: "monospace" }}>
                Transaction {notes.pendingNoteSave.proof.cardanoTxHash}
              </div>
              <div style={{ marginTop: "4px", fontSize: "13px" }}>
                {notes.pendingNoteSave.error}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void notes.retryPendingNoteSave()}
              disabled={notes.isSubmitting}
              style={{
                flex: "0 0 auto",
                border: "none",
                borderRadius: "7px",
                padding: "10px 14px",
                backgroundColor: "#9A3412",
                color: "#FFFFFF",
                fontWeight: 700,
                cursor: notes.isSubmitting ? "wait" : "pointer",
              }}
            >
              {notes.isSubmitting ? "Retrying..." : "Retry saving note"}
            </button>
          </div>
        )}

        {globalError && (
          <div
            role="alert"
            style={{
              padding: "16px 56px",
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontWeight: 500,
            }}
          >
            {globalError}
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
            pagination={notes.activityPagination}
            error={notes.activityError}
            walletAuth={walletAuth}
            onPageChange={notes.setActivityPage}
            onRetryNoteSave={notes.retryActivitySave}
            onVerifyProof={notes.verifyProof}
            proofActionErrors={notes.proofActionErrors}
            proofVerifications={notes.proofVerifications}
            retryingActivityIds={notes.retryingActivityIds}
            verifyingProofIds={notes.verifyingProofIds}
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

const disconnectedWalletMessage = "Connect your Preprod wallet before saving this note.";
