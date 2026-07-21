import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChainBlock,
  WalletTransactionsResponse,
} from "../../../types/blockchain";
import {
  addNote,
  deleteNote,
  fetchChain,
  fetchTrash,
  fetchWalletTransactions,
  getApiError,
  hardDeleteNote,
  restoreNote,
  updateNote,
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
};

export function useNotes({ walletAddress }: UseNotesOptions = {}) {
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
  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(new Set());
  const [walletTransactions, setWalletTransactions] =
    useState<WalletTransactionsResponse | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState("");

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

  const loadWalletTransactions = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsWalletLoading(true);
      }

      setWalletError("");

      try {
        setWalletTransactions(await fetchWalletTransactions());
      } catch (requestError) {
        setWalletError(
          getApiError(requestError, "Unable to load live wallet transactions.")
        );
      } finally {
        setIsWalletLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadNotes();
    void loadWalletTransactions();
  }, [loadNotes, loadWalletTransactions]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      void loadWalletTransactions({ silent: true });
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [loadWalletTransactions]);

  async function saveNote(values: NoteFormValues) {
    setModalError("");

    if (!editingNoteId && !walletAddress) {
      setModalError("Connect your wallet before creating a note.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");

    try {
      const author = walletAddress || editingNote?.author || "Me";

      if (editingNoteId) {
        await updateNote({ id: editingNoteId, author, ...values });
      } else {
        await addNote({ author, ...values });
      }

      await Promise.all([loadNotes(), loadWalletTransactions()]);
      closeModal();
    } catch (requestError) {
      setModalError(getApiError(requestError, "The note could not be saved."));
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

    try {
      await deleteNote(id);
      removePinnedNote(id);
      await Promise.all([loadNotes(), loadWalletTransactions()]);
    } catch (requestError) {
      setGlobalError(getApiError(requestError, "The note could not be deleted."));
    }
  }

  async function restoreDeletedNote(id?: string) {
    if (!id) {
      setGlobalError(missingNoteIdMessage);
      return;
    }

    setGlobalError("");

    try {
      await restoreNote(id);
      await Promise.all([loadNotes(), loadWalletTransactions()]);
    } catch (requestError) {
      setGlobalError(getApiError(requestError, "The note could not be restored."));
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

    try {
      await hardDeleteNote(id);
      removePinnedNote(id);
      await Promise.all([loadNotes(), loadWalletTransactions()]);
    } catch (requestError) {
      setGlobalError(getApiError(requestError, "The note could not be permanently deleted."));
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

  return {
    activeTab,
    closeModal,
    counts,
    editingNote,
    filteredNotes,
    globalError,
    isLoading,
    isModalOpen,
    isSubmitting,
    isWalletLoading,
    modalError,
    moveNoteToTrash,
    openEditNote,
    openNewNote,
    permanentlyDeleteNote,
    restoreDeletedNote,
    saveNote,
    setActiveTab,
    setSearchQuery,
    title,
    togglePinnedNote,
    walletError,
    walletTransactions,
    refreshWalletTransactions: loadWalletTransactions,
  };
}

const missingNoteIdMessage =
  "This note is missing its backend ID. Restart the backend server, reload the app, and try again.";

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
