import { useEffect, useMemo, useState } from "react";
import { addNote, fetchChain, getApiError } from "./api/blockchainApi";
import type { BlockfrostProvider, CardanoBlock, ChainBlock } from "./types/blockchain";
import Sidebar from "./components/Sidebar";
import MainArea from "./components/MainArea";
import NoteModal from "./components/NoteModal";


interface UINote {
  hash: string;
  author: string;
  content: string;
  title?: string;
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

  const [pinnedHashes, setPinnedHashes] = useState<Set<string>>(new Set());


  const allNotes: UINote[] = useMemo(() => {
    return [...chain].reverse().map((block) => {
      let title = '';
      let tag = 'General';
      let content = block.note.content;

      try {

        const parsed = JSON.parse(block.note.content);
        if (parsed && typeof parsed === 'object' && parsed.content) {
          title = parsed.title || '';
          tag = parsed.tag || 'General';
          content = parsed.content;
        }
      } catch (e) {
      }

      return {
        hash: block.hash,
        author: block.note.author,
        content: content,
        title: title,
        timestamp: block.timestamp,
        tag: tag,
        isPinned: pinnedHashes.has(block.hash)
      };
    });
  }, [chain, pinnedHashes]);


  const filteredNotes = useMemo(() => {
    let result = allNotes;
    

    if (activeTab === 'pinned') {
      result = result.filter(n => n.isPinned);
    } else if (activeTab !== 'all') {

      result = result.filter(n => n.tag?.toLowerCase() === activeTab);
    }
    

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.content.toLowerCase().includes(q) || 
        (n.tag && n.tag.toLowerCase().includes(q))
      );
    }
    

    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
    
    return result;
  }, [allNotes, activeTab, searchQuery]);


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


  const mainTitle = useMemo(() => {
    if (activeTab === 'all') return 'All notes';
    if (activeTab === 'pinned') return 'Pinned notes';
    return `#${activeTab.toLowerCase()}`;
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

  async function handleSaveNote(content: string, tag: string, title?: string) {
    setIsSubmitting(true);
    setModalError("");

    try {

      const notePayload = JSON.stringify({
        title: title || '',
        tag: tag || 'General',
        content: content.trim()
      });

      await addNote({
        author: "Me",
        content: notePayload,
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
  
  function handleDeleteNote(id: string) {
    alert("Delete functionality is not fully implemented in the blockchain backend yet, but the UI is ready!");
  }
  
  function handleTogglePin(id: string) {
    setPinnedHashes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
          />
        )}
      </div>

      {isModalOpen && (
        <NoteModal 
          initialTitle={editingNote?.title}
          initialContent={editingNote?.content}
          initialSelectedTag={editingNote?.tag}
          isSubmitting={isSubmitting}
          error={modalError}
          onSave={handleSaveNote}
          onClose={() => { setIsModalOpen(false); setEditingNoteId(null); }}
        />
      )}
    </div>
  );
}
