import React from 'react';
import { Search, Plus } from 'lucide-react';
import NoteCard from './NoteCard';

interface Note {
  hash: string;
  author: string;
  content: string;
  title?: string;
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
  onDeleteNote?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

export default function MainArea({ title, notes, onSearch, onNewNote, onEditNote, onDeleteNote, onTogglePin }: MainAreaProps) {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  return (
    <div style={{
      marginLeft: '260px',
      padding: '48px 56px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>

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

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            border: '1px solid',
            borderColor: isSearchFocused ? 'var(--accent-orange)' : 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            borderRadius: '8px',
            padding: '8px 16px',
            width: '280px',
            transition: 'border-color 0.2s ease'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search notes..."
              onChange={(e) => onSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
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


          <button
            onClick={onNewNote}
            style={{
              backgroundColor: '#221811',
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
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#221811'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#221811'}
          >
            <Plus size={16} />
            New note
          </button>
        </div>
      </div>


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

            const lines = note.content.split('\n');
            const title = note.title || (lines[0].length > 30 ? lines[0].substring(0, 30) + '...' : lines[0]);
            const contentPreview = note.title ? note.content : (lines.slice(1).join('\n') || note.content);


            const date = new Date(note.timestamp);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear().toString().slice(-2);
            
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            const formattedTime = `${month}/${day}/${year}-${hours}:${minutes} ${ampm}`;

            return (
              <NoteCard
                key={note.hash}
                id={note.hash}
                title={title}
                content={contentPreview}
                timestamp={formattedTime}
                tag={note.tag || 'General'}
                isPinned={note.isPinned}
                onEdit={onEditNote}
                onDelete={onDeleteNote}
                onTogglePin={onTogglePin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
