import React from 'react';
import { PenLine, BellOff, Pin } from 'lucide-react';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  tag?: string;
  isPinned?: boolean;
  onEdit: (id: string) => void;
}

export default function NoteCard({ id, title, content, timestamp, tag, isPinned, onEdit }: NoteCardProps) {
  return (
    <div 
      className="card-hover"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-light)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: 'fit-content'
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
                  {tag}
                </span>
              </>
            )}
          </div>
        </div>
        
        {isPinned ? (
          <div style={{ color: '#C6B5A1', backgroundColor: '#F9F6F0', padding: '6px', borderRadius: '8px' }}>
             <Pin size={16} fill="currentColor" />
          </div>
        ) : (
          <BellOff size={16} color="#C6B5A1" />
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
        marginTop: 'auto'
      }}>
        <button 
          onClick={() => onEdit(id)}
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
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <PenLine size={14} />
          Edit
        </button>
      </div>
    </div>
  );
}
