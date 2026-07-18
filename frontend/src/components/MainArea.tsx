import React from 'react';
import { Search, Plus } from 'lucide-react';
import NoteCard from './NoteCard';

interface Note {
  hash: string;
  author: string;
  content: string;
  timestamp: string | number;
  tag?: string;
  isPinned?: boolean;
}

interface MainAreaProps {
  title: string;
  notes: Note[];
  onSearch: (query: string) => void;
  onNewNote: () => void;
  onEditNote: (id: string) => void;
}

export default function MainArea({ title, notes, onSearch, onNewNote, onEditNote }: MainAreaProps) {
  return (
    <div style={{
      marginLeft: '260px', // width of sidebar
      padding: '48px 56px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="serif-title" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            {title}
          </h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '8px 16px',
            width: '280px'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              onChange={(e) => onSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '14px',
                color: 'var(--text-main)'
              }}
            />
          </div>
          
          {/* Top Right New Note Button */}
          <button 
            onClick={onNewNote}
            style={{
              backgroundColor: '#2A2A2A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2A2A2A'}
          >
            <Plus size={16} />
            New note
          </button>
        </div>
      </div>

      {/* Grid */}
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          No notes found in this category.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }}>
          {notes.map(note => {
            // Try to extract title from content if no explicit title exists
            const lines = note.content.split('\n');
            const title = lines[0].length > 30 ? lines[0].substring(0, 30) + '...' : lines[0];
            const contentPreview = lines.slice(1).join('\n') || note.content;
            
            // Format timestamp
            const timeAgo = typeof note.timestamp === 'string' ? note.timestamp : new Date(note.timestamp).toLocaleString();

            return (
              <NoteCard
                key={note.hash}
                id={note.hash}
                title={title}
                content={contentPreview}
                timestamp={timeAgo}
                tag={note.tag || 'General'}
                isPinned={note.isPinned}
                onEdit={onEditNote}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
