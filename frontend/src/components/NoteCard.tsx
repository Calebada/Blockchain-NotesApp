import React, { useState } from 'react';
import { PenLine, Pin, PinOff, Trash2 } from 'lucide-react';

interface NoteCardProps {
  id?: string;
  title: string;
  content: string;
  timestamp: string;
  tag?: string;
  isPinned?: boolean;
  onEdit: (id: string) => void;
  onDelete?: (id?: string) => void;
  onTogglePin?: () => void;
}

export default function NoteCard({ id, title, content, timestamp, tag, isPinned, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="card-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: isHovered ? 'var(--accent-orange)' : 'var(--border-light)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: 'fit-content',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="serif-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            {title || 'Untitled'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>{timestamp}</span>
            {tag && (
              <>
                <span>·</span>
                <span style={{
                  backgroundColor: '#F3EFEA',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 500,
                  color: '#8C7C6D'
                }}>
                  #{tag.toLowerCase()}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => onTogglePin && onTogglePin()}
          style={{
            background: isPinned ? '#FCEADB' : 'transparent',
            color: isPinned ? '#2A2A2A' : '#C6B5A1',
            padding: '6px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isPinned) e.currentTarget.style.color = '#8A7A6D';
          }}
          onMouseLeave={(e) => {
            if (!isPinned) e.currentTarget.style.color = '#C6B5A1';
          }}
        >
          {isPinned ? <Pin size={16} fill="currentColor" /> : <PinOff size={16} />}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: content ? 'var(--text-main)' : 'var(--text-muted)',
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontStyle: content ? 'normal' : 'italic'
        }}>
          {content || 'No content yet...'}
        </p>
      </div>

      <div style={{
        borderTop: '1px solid var(--border-light)',
        paddingTop: '12px',
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={() => id && onEdit(id)}
          disabled={!id}
          title={id ? "Edit note" : "Restart the backend server to edit this note"}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: id ? 'pointer' : 'not-allowed',
            opacity: id ? 1 : 0.55
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <PenLine size={14} />
          Edit
        </button>

        {isHovered && (
          <button
            onClick={() => onDelete && onDelete(id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#F87171',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
            title="Delete note"
            onMouseEnter={(e) =>
              e.currentTarget.style.backgroundColor = '#FEF2F2'
            }
            onMouseLeave={(e) =>
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
