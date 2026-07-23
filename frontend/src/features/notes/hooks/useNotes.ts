import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BlockchainProof,
  ChainBlock,
  NoteActivity,
  NoteActivityResponse,
  NoteTransactionIntent,
  ProofVerificationResult,
} from "../../../types/blockchain";
import {
  addNote,
  deleteNote,
  fetchActivity,
  fetchChain,
  fetchTrash,
  getApiError,
  hardDeleteNote,
  retryActivityNoteSave,
  restoreNote,
  updateNote,
  verifyActivityProof,
} from "../services/notes-api";
import { NOTE_TAG_OPTIONS } from "../types/note";
import type {
  FrontendNote,
  NoteContent,
  NoteFormValues,
  NoteTag,
} from "../types/note";

type UseNotesOptions = {
  walletAddress?: string | null;
  publishNoteProof?: (intent: NoteTransactionIntent) => Promise<BlockchainProof>;
};

type PendingNoteSave = {
  intent: NoteTransactionIntent;
  author: string;
  proof: BlockchainProof;
  error: string;
};

const PENDING_NOTE_SAVE_STORAGE_KEY = "notetify.pendingNoteSave";

export function useNotes({ walletAddress, publishNoteProof }: UseNotesOptions = {}) {
  const [chain, setChain] = useState<ChainBlock[]>([]);
  const [trashChain, setTrashChain] = useState<ChainBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("pinnedNoteIds");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem("pinnedNoteIds", JSON.stringify(Array.from(pinnedNoteIds)));
  }, [pinnedNoteIds]);

  const [activity, setActivity] = useState<NoteActivity[]>([]);
  const [activityPagination, setActivityPagination] = useState<
    NoteActivityResponse["pagination"]
  >({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [activityError, setActivityError] = useState("");
  const [proofVerifications, setProofVerifications] = useState<
    Record<string, ProofVerificationResult>
  >({});
  const [verifyingProofIds, setVerifyingProofIds] = useState<Set<string>>(
    () => new Set()
  );
  const [retryingActivityIds, setRetryingActivityIds] = useState<Set<string>>(
    () => new Set()
  );
  const [proofActionErrors, setProofActionErrors] = useState<
    Record<string, string>
  >({});
  const [pendingNoteSave, setPendingNoteSave] = useState<PendingNoteSave | null>(
    () => {
      try {
        const saved = localStorage.getItem(PENDING_NOTE_SAVE_STORAGE_KEY);
        return saved ? (JSON.parse(saved) as PendingNoteSave) : null;
      } catch {
        return null;
      }
    }
  );

  useEffect(() => {
    if (pendingNoteSave) {
      localStorage.setItem(
        PENDING_NOTE_SAVE_STORAGE_KEY,
        JSON.stringify(pendingNoteSave)
      );
    } else {
      localStorage.removeItem(PENDING_NOTE_SAVE_STORAGE_KEY);
    }
  }, [pendingNoteSave]);

  const allNotes = useMemo<FrontendNote[]>(
    () => [...chain].reverse().map((block) => toFrontendNote(block, pinnedNoteIds)),
    [chain, pinnedNoteIds]
  );

  const trashNotes = useMemo<FrontendNote[]>(
    () => trashChain.map((block) => toFrontendNote(block, pinnedNoteIds)),
    [trashChain, pinnedNoteIds]
  );

  const filteredNotes = useMemo(() => {
    let result = activeTab === "trash" ? trashNotes : allNotes;

    if (activeTab === "pinned") {
      result = result.filter((note) => note.isPinned);
    } else if (activeTab !== "all" && activeTab !== "trash") {
      result = result.filter((note) => note.tag.toLowerCase() === activeTab);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(normalizedQuery) ||
          note.content.toLowerCase().includes(normalizedQuery) ||
          note.tag.toLowerCase().includes(normalizedQuery)
      );
    }

    return [...result].sort(sortPinnedFirst);
  }, [activeTab, allNotes, searchQuery, trashNotes]);

  const counts = useMemo(() => {
    const tags: Record<string, number> = {};

    allNotes.forEach((note) => {
      tags[note.tag] = (tags[note.tag] || 0) + 1;
    });

    return {
      all: allNotes.length,
      pinned: allNotes.filter((note) => note.isPinned).length,
      trash: trashNotes.length,
      tags,
    };
  }, [allNotes, trashNotes]);

  const title = useMemo(() => {
    if (activeTab === "all") return "All notes";
    if (activeTab === "pinned") return "Pinned notes";
    if (activeTab === "trash") return "Trash";
    return `#${activeTab.toLowerCase()}`;
  }, [activeTab]);

  const editingNote = useMemo(
    () => allNotes.find((note) => note.id === editingNoteId),
    [allNotes, editingNoteId]
  );

  const loadNotes = useCallback(async () => {
    setGlobalError("");

    try {
      const [chainState, trashState] = await Promise.all([fetchChain(), fetchTrash()]);
      setChain(chainState.chain);
      setTrashChain(trashState.chain);
    } catch (requestError) {
      setGlobalError(
        getApiError(
          requestError,
          "Unable to reach the backend. Start the API and configure Blockfrost."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async (page = activityPagination.page) => {
    if (!walletAddress) {
      setActivity([]);
      setActivityPagination((previous) => ({
        ...previous,
        page: 1,
        total: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      }));
      setActivityError("");
      return;
    }

    setActivityError("");

    try {
      const activityState = await fetchActivity(walletAddress, {
        page,
        pageSize: activityPagination.pageSize,
      });
      setActivity(activityState.activity);
      setActivityPagination(activityState.pagination);
    } catch (requestError) {
      setActivityError(getApiError(requestError, "Unable to load note activity."));
    }
  }, [activityPagination.page, activityPagination.pageSize, walletAddress]);

  const setActivityPage = useCallback(
    (page: number) => {
      const nextPage = Math.max(1, page);
      setActivityPagination((previous) => ({ ...previous, page: nextPage }));
    },
    []
  );

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      void loadActivity();
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [loadActivity]);

  async function saveNote(values: NoteFormValues) {
    setModalError("");

    if (!walletAddress || !publishNoteProof) {
      setModalError(disconnectedWalletMessage);
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    const author = walletAddress || editingNote?.author || "Me";
    const intent: NoteTransactionIntent = {
      action: editingNoteId ? "UPDATE_NOTE" : "CREATE_NOTE",
      noteId: editingNoteId || undefined,
      ...values,
    };
    let chainProof: BlockchainProof | null = null;

    try {
      chainProof = await publishNoteProof(intent);

      if (editingNoteId) {
        await updateNote({
          id: editingNoteId,
          author,
          walletAddress,
          ...values,
          ...chainProof,
        });
      } else {
        await addNote({ author, walletAddress, ...values, ...chainProof });
      }

      setPendingNoteSave(null);
      await Promise.all([loadNotes(), loadActivity(1)]);
      closeModal();
    } catch (requestError) {
      const message = getApiError(requestError, "The note could not be saved.");

      if (chainProof) {
        rememberPendingNoteSave(intent, author, chainProof, message);
      }

      setModalError(
        chainProof
          ? `The blockchain transaction succeeded (${formatHash(
              chainProof.cardanoTxHash
            )}), but the note was not saved. Use "Retry saving note" below.`
          : message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openNewNote() {
    setEditingNoteId(null);
    setModalError("");
    setIsModalOpen(true);
  }

  function openEditNote(id: string) {
    if (!id) {
      setGlobalError(missingNoteIdMessage);
      return;
    }

    setEditingNoteId(id);
    setModalError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingNoteId(null);
    setModalError("");
  }

  async function moveNoteToTrash(id?: string) {
    if (!id) {
      setGlobalError(missingNoteIdMessage);
      return;
    }

    if (!window.confirm("Move this note to Trash?")) {
      return;
    }

    setGlobalError("");
    const note = allNotes.find((candidate) => candidate.id === id);
    const intent: NoteTransactionIntent = {
      action: "DELETE_NOTE",
      noteId: id,
      title: note?.title,
      tag: note?.tag,
      content: note?.content,
    };
    let chainProof: BlockchainProof | null = null;

    try {
      chainProof = await createChainProof(intent);
      await deleteNote(id, walletAddress, chainProof);
      setPendingNoteSave(null);
      removePinnedNote(id);
      await Promise.all([loadNotes(), loadActivity(1)]);
    } catch (requestError) {
      const message = getApiError(requestError, "The note could not be deleted.");
      if (chainProof) {
        rememberPendingNoteSave(intent, walletAddress || "Me", chainProof, message);
      }
      setGlobalError(chainProof ? partialSaveMessage(chainProof) : message);
    }
  }

  async function restoreDeletedNote(id?: string) {
    if (!id) {
      setGlobalError(missingNoteIdMessage);
      return;
    }

    setGlobalError("");
    const note = trashNotes.find((candidate) => candidate.id === id);
    const intent: NoteTransactionIntent = {
      action: "RESTORE_NOTE",
      noteId: id,
      title: note?.title,
      tag: note?.tag,
      content: note?.content,
    };
    let chainProof: BlockchainProof | null = null;

    try {
      chainProof = await createChainProof(intent);
      await restoreNote(id, walletAddress, chainProof);
      setPendingNoteSave(null);
      await Promise.all([loadNotes(), loadActivity(1)]);
    } catch (requestError) {
      const message = getApiError(requestError, "The note could not be restored.");
      if (chainProof) {
        rememberPendingNoteSave(intent, walletAddress || "Me", chainProof, message);
      }
      setGlobalError(chainProof ? partialSaveMessage(chainProof) : message);
    }
  }

  async function permanentlyDeleteNote(id?: string) {
    if (!id) {
      setGlobalError(missingNoteIdMessage);
      return;
    }

    if (!window.confirm("Permanently delete this note? This cannot be undone.")) {
      return;
    }

    setGlobalError("");
    const note = [...allNotes, ...trashNotes].find(
      (candidate) => candidate.id === id
    );
    const intent: NoteTransactionIntent = {
      action: "PERMANENT_DELETE_NOTE",
      noteId: id,
      title: note?.title,
      tag: note?.tag,
      content: note?.content,
    };
    let chainProof: BlockchainProof | null = null;

    try {
      chainProof = await createChainProof(intent);
      await hardDeleteNote(id, walletAddress, chainProof);
      setPendingNoteSave(null);
      removePinnedNote(id);
      await Promise.all([loadNotes(), loadActivity(1)]);
    } catch (requestError) {
      const message = getApiError(
        requestError,
        "The note could not be permanently deleted."
      );
      if (chainProof) {
        rememberPendingNoteSave(intent, walletAddress || "Me", chainProof, message);
      }
      setGlobalError(chainProof ? partialSaveMessage(chainProof) : message);
    }
  }

  function togglePinnedNote(id: string) {
    setPinnedNoteIds((previousIds) => {
      const nextIds = new Set(previousIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  }

  function removePinnedNote(id: string) {
    setPinnedNoteIds((previousIds) => {
      const nextIds = new Set(previousIds);
      nextIds.delete(id);
      return nextIds;
    });
  }

  async function createChainProof(intent: NoteTransactionIntent) {
    if (!walletAddress || !publishNoteProof) {
      throw new Error(disconnectedWalletMessage);
    }

    return publishNoteProof(intent);
  }

  function rememberPendingNoteSave(
    intent: NoteTransactionIntent,
    author: string,
    proof: BlockchainProof,
    error: string
  ) {
    setPendingNoteSave({ intent, author, proof, error });
  }

  async function retryPendingNoteSave() {
    if (!pendingNoteSave) {
      return;
    }

    setIsSubmitting(true);
    setGlobalError("");
    setModalError("");

    try {
      await saveWithExistingProof(pendingNoteSave);
      setPendingNoteSave(null);
      await Promise.all([loadNotes(), loadActivity(1)]);
      closeModal();
    } catch (requestError) {
      const error = getApiError(
        requestError,
        "The note still could not be saved. The existing transaction hash remains preserved."
      );
      setPendingNoteSave((previous) => (previous ? { ...previous, error } : null));
      setGlobalError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveWithExistingProof(recovery: PendingNoteSave) {
    const { intent, author, proof } = recovery;
    const noteId = intent.noteId;

    if (intent.action === "CREATE_NOTE") {
      await addNote({
        author,
        walletAddress: proof.proofPayload.walletAddress,
        title: intent.title || "",
        tag: normalizeTag(intent.tag),
        content: intent.content || "",
        ...proof,
      });
      return;
    }
    if (intent.action === "UPDATE_NOTE") {
      await updateNote({
        id: noteId || "",
        author,
        walletAddress: proof.proofPayload.walletAddress,
        title: intent.title || "",
        tag: normalizeTag(intent.tag),
        content: intent.content || "",
        ...proof,
      });
      return;
    }
    if (intent.action === "DELETE_NOTE") {
      await deleteNote(noteId, proof.proofPayload.walletAddress, proof);
      return;
    }
    if (intent.action === "RESTORE_NOTE") {
      await restoreNote(noteId, proof.proofPayload.walletAddress, proof);
      return;
    }

    await hardDeleteNote(noteId, proof.proofPayload.walletAddress, proof);
  }

  async function verifyProof(activityId: string) {
    if (!walletAddress) {
      return;
    }

    setVerifyingProofIds((previous) => new Set(previous).add(activityId));
    setProofActionErrors((previous) => ({ ...previous, [activityId]: "" }));

    try {
      const verification = await verifyActivityProof(activityId, walletAddress);
      setProofVerifications((previous) => ({
        ...previous,
        [activityId]: verification,
      }));
      await loadActivity();
    } catch (requestError) {
      setProofActionErrors((previous) => ({
        ...previous,
        [activityId]: getApiError(requestError, "Unable to verify this proof."),
      }));
    } finally {
      setVerifyingProofIds((previous) => {
        const next = new Set(previous);
        next.delete(activityId);
        return next;
      });
    }
  }

  async function retryActivitySave(activityId: string) {
    if (!walletAddress) {
      return;
    }

    setRetryingActivityIds((previous) => new Set(previous).add(activityId));
    setProofActionErrors((previous) => ({ ...previous, [activityId]: "" }));

    try {
      await retryActivityNoteSave(activityId, walletAddress);
      setPendingNoteSave((previous) =>
        previous?.proof.proofRecordId === activityId ? null : previous
      );
      await Promise.all([loadNotes(), loadActivity()]);
    } catch (requestError) {
      setProofActionErrors((previous) => ({
        ...previous,
        [activityId]: getApiError(
          requestError,
          "The note still could not be saved."
        ),
      }));
    } finally {
      setRetryingActivityIds((previous) => {
        const next = new Set(previous);
        next.delete(activityId);
        return next;
      });
    }
  }

  return {
    activeTab,
    closeModal,
    counts,
    editingNote,
    filteredNotes,
    globalError,
    activity,
    activityError,
    activityPagination,
    pendingNoteSave,
    proofActionErrors,
    proofVerifications,
    retryingActivityIds,
    verifyingProofIds,
    isLoading,
    isModalOpen,
    isSubmitting,
    modalError,
    moveNoteToTrash,
    openEditNote,
    openNewNote,
    permanentlyDeleteNote,
    restoreDeletedNote,
    retryActivitySave,
    retryPendingNoteSave,
    saveNote,
    setActivityPage,
    setActiveTab,
    setSearchQuery,
    title,
    togglePinnedNote,
    verifyProof,
  };
}

const missingNoteIdMessage =
  "This note is missing its backend ID. Restart the backend server, reload the app, and try again.";
const disconnectedWalletMessage = "Connect your Preprod wallet before saving this note.";

function formatHash(value: string) {
  return value.length <= 20
    ? value
    : `${value.slice(0, 10)}...${value.slice(-10)}`;
}

function partialSaveMessage(proof: BlockchainProof) {
  return `The blockchain transaction succeeded (${formatHash(
    proof.cardanoTxHash
  )}), but the note action was not saved. Use "Retry saving note".`;
}

function sortPinnedFirst(left: FrontendNote, right: FrontendNote) {
  return Number(right.isPinned) - Number(left.isPinned);
}

function normalizeTag(tag: unknown): NoteTag {
  if (typeof tag !== "string") {
    return "General";
  }

  return (
    NOTE_TAG_OPTIONS.find(
      (option) => option.toLowerCase() === tag.trim().toLowerCase()
    ) || "General"
  );
}

function parseNoteContent(rawContent: string): NoteContent {
  try {
    const parsed: unknown = JSON.parse(rawContent);

    if (parsed && typeof parsed === "object" && "content" in parsed) {
      const parsedNote = parsed as {
        content?: unknown;
        tag?: unknown;
        title?: unknown;
      };

      if (typeof parsedNote.content === "string") {
        return {
          title: typeof parsedNote.title === "string" ? parsedNote.title.trim() : "",
          tag: normalizeTag(parsedNote.tag),
          content: parsedNote.content,
        };
      }
    }
  } catch {
    // Plain text notes are valid legacy content.
  }

  return {
    title: "",
    tag: "General",
    content: rawContent,
  };
}

function toFrontendNote(
  block: ChainBlock,
  pinnedNoteIds: ReadonlySet<string>
): FrontendNote {
  const noteContent =
    block.note.title || block.note.tag
      ? {
        title: block.note.title || "",
        tag: normalizeTag(block.note.tag),
        content: block.note.content,
      }
      : parseNoteContent(block.note.content);
  const pinKey = block.id || block.hash;

  return {
    id: block.id,
    pinKey,
    hash: block.hash,
    author: block.note.author,
    timestamp: block.timestamp,
    deletedAt: block.deletedAt,
    isPinned: pinnedNoteIds.has(pinKey),
    ...noteContent,
  };
}
