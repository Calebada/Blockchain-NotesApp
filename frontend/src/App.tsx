import { type ReactNode, useEffect, useMemo, useState } from "react";
import { addNote, fetchChain, getApiError } from "./api/blockchainApi";
import type { BlockfrostProvider, CardanoBlock, ChainBlock } from "./types/blockchain";
import Sidebar from "./components/Sidebar";
import MainArea from "./components/MainArea";
import NoteModal from "./components/NoteModal";

// Extend ChainBlock internally to include our UI state
interface UINote {
  hash: string;
  author: string;
  content: string;
  timestamp: string | number;
  tag?: string;
  isPinned?: boolean;
}

export default function App() {
  const [chain, setChain] = useState<ChainBlock[]>([]);
  const [provider, setProvider] = useState<BlockfrostProvider | null>(null);
  const [latestBlock, setLatestBlock] = useState<CardanoBlock | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Convert chain blocks to UI notes (and mock some tags/pins for the UI demo)
  const allNotes: UINote[] = useMemo(() => {
    return [...chain].reverse().map((block, index) => {
      // Mock tags based on hash to keep it consistent
      const tags = ['General', 'Ideas', 'Personal', 'Work'];
      const tagIndex = block.hash ? block.hash.charCodeAt(0) % tags.length : 0;
      
      return {
        hash: block.hash,
        author: block.note.author,
        content: block.note.content,
        timestamp: block.timestamp,
        tag: tags[tagIndex],
        isPinned: index === 0 || index === 2 // Just pin a couple for demo purposes
      };
    });
  }, [chain]);

  // Filter notes based on active tab and search
  const filteredNotes = useMemo(() => {
    let result = allNotes;
    
    // Filter by tab
    if (activeTab === 'pinned') {
      result = result.filter(n => n.isPinned);
    } else if (activeTab !== 'all') {
      // Tab is a tag
      result = result.filter(n => n.tag?.toLowerCase() === activeTab);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.content.toLowerCase().includes(q) || 
        (n.tag && n.tag.toLowerCase().includes(q))
      );
    }
    
    return result;
  }, [allNotes, activeTab, searchQuery]);

  // Calculate counts for sidebar
  const counts = useMemo(() => {
    const tagsCount: Record<string, number> = {};
    allNotes.forEach(n => {
      if (n.tag) {
        tagsCount[n.tag] = (tagsCount[n.tag] || 0) + 1;
      }
    });

    return {
      all: allNotes.length,
      pinned: allNotes.filter(n => n.isPinned).length,
      tags: tagsCount
    };
  }, [allNotes]);

  // Determine Title for MainArea
  const mainTitle = useMemo(() => {
    if (activeTab === 'all') return 'All notes';
    if (activeTab === 'pinned') return 'Pinned notes';
    return `#${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
  }, [activeTab]);


  async function loadChain() {
    setGlobalError("");
    try {
      const chainState = await fetchChain();
      setChain(chainState.chain);
      setProvider(chainState.provider);
      setLatestBlock(chainState.latestBlock);
      setIsValid(chainState.valid);
    } catch (requestError) {
      setGlobalError(
        getApiError(
          requestError,
          "Unable to reach the backend. Start the API on port 5000 and configure Blockfrost."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadChain();
  }, []);

  async function handleSaveNote(content: string, tag: string) {
    setIsSubmitting(true);
    setModalError("");

    try {
      // Since our current backend doesn't support tags/edits, we just add a new note
      // If we are "editing", we could potentially send a request to update, but the 
      // blockchain API (chain of blocks) is immutable in this demo.
      // We will just create a new note for the demo.
      await addNote({
        author: "Me", // Hardcoded for this UI demo
        content: content.trim(),
      });

      await loadChain();
      setIsModalOpen(false);
      setEditingNoteId(null);
    } catch (requestError) {
      setModalError(getApiError(requestError, "The note could not be saved."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenNewNote() {
    setEditingNoteId(null);
    setIsModalOpen(true);
  }

  function handleOpenEditNote(id: string) {
    setEditingNoteId(id);
    setIsModalOpen(true);
  }
  
  const editingNote = editingNoteId ? allNotes.find(n => n.hash === editingNoteId) : undefined;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar 
        activeTab={activeTab} 
        onTabSelect={setActiveTab} 
        onNewNote={handleOpenNewNote}
        counts={counts}
      />
      
      <div style={{ flex: 1 }}>
        {globalError && (
          <div style={{ padding: '16px 56px', backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 500 }}>
            {globalError}
          </div>
        )}
        
        {isLoading ? (
          <div style={{ marginLeft: '260px', padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading notes...
          </div>
        ) : (
          <MainArea 
            title={mainTitle}
            notes={filteredNotes}
            onSearch={setSearchQuery}
            onNewNote={handleOpenNewNote}
            onEditNote={handleOpenEditNote}
          />
        )}
      </div>

      {isModalOpen && (
        <NoteModal 
          initialContent={editingNote?.content}
          initialTag={editingNote?.tag}
          isSubmitting={isSubmitting}
          error={modalError}
          onSave={handleSaveNote}
          onClose={() => { setIsModalOpen(false); setEditingNoteId(null); }}
        />
      )}
    </div>
  );
}
