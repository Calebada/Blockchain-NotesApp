import React, { useState } from 'react';
import { PenLine, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '../constants/tagColors';

interface NoteCardProps {
  id?: string;
  title: string;
  content: string;
  timestamp: string;
  tag?: string;
  isPinned?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  onEdit: (id: string) => void;
  onDelete?: (id?: string) => void;
  onRestore?: (id?: string) => void;
  onHardDelete?: (id?: string) => void;
  onTogglePin?: () => void;
}


function getTagColor(tag?: string) {
  if (!tag) return DEFAULT_TAG_COLOR;
  return TAG_COLORS[tag.toLowerCase()] || DEFAULT_TAG_COLOR;
}

export default function NoteCard({
  id,
  title,
  content,
  timestamp,
  tag,
  isPinned,
  isDeleted,
  deletedAt,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  onTogglePin,
}: NoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tagColor = getTagColor(tag);

  return (
    <div
      className="card-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
  background: `linear-gradient(160deg, ${tagColor.bg} 0, ${tagColor.bg} 50%, var(--bg-card) 75%)`,
  borderRadius: '12px',
  border: '1.5px solid',
  borderColor: isHovered ? 'var(--accent-orange)' : tagColor.accent,
  padding: '22px 24px 24px',
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
          <h3 className="serif-title" style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', letterSpacing: '-0.3px' }}>
            {title || 'Untitled'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)', letterSpacing: '0.2px' }}>
            <span>{timestamp}</span>
            {tag && (
              <>
                <span>·</span>
                <span style={{
                  backgroundColor: `${tagColor.accent}33`,
                  border: `1px solid ${tagColor.accent}`,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '11px',
                  color: tagColor.text
                }}>
                  #{tag.toLowerCase()}
                </span>
              </>
            )}
            {isDeleted && deletedAt && (
              <>
                <span>&middot;</span>
                <span>Deleted {deletedAt}</span>
              </>
            )}
          </div>
        </div>

        {!isDeleted && (
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
        )}
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
        {isDeleted ? (
          <button
            onClick={() => onRestore && onRestore(id)}
            disabled={!id}
            title={id ? "Restore note" : "Restart the backend server to restore this note"}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: id ? 'pointer' : 'not-allowed',
              opacity: id ? 1 : 0.55,
              transition: 'background-color 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RotateCcw size={17} strokeWidth={2.2} />
            Restore
          </button>
        ) : (
          <button
            onClick={() => id && onEdit(id)}
            disabled={!id}
            title={id ? "Edit note" : "Restart the backend server to edit this note"}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: id ? 'pointer' : 'not-allowed',
              opacity: id ? 1 : 0.55,
              transition: 'background-color 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <PenLine size={17} strokeWidth={2.2} />
            Edit
          </button>
        )}

        {isHovered && (
          <button
            onClick={() => isDeleted ? onHardDelete && onHardDelete(id) : onDelete && onDelete(id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              color: '#DC5B5B',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '7px',
              transition: 'background-color 0.2s'
            }}
            title={isDeleted ? "Permanently delete note" : "Move note to trash"}
            onMouseEnter={(e) =>
              e.currentTarget.style.backgroundColor = '#FEE2E2'
            }
            onMouseLeave={(e) =>
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          >
            <Trash2 size={17} strokeWidth={2.2} />
            {isDeleted ? 'Delete forever' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}