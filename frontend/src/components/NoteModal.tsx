import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Save } from 'lucide-react';

interface NoteModalProps {
  initialContent?: string;
  initialTag?: string;
  isSubmitting: boolean;
  error?: string;
  onSave: (content: string, tag: string) => void;
  onClose: () => void;
}

export default function NoteModal({ initialContent = '', initialTag = 'General', isSubmitting, error, onSave, onClose }: NoteModalProps) {
  const [content, setContent] = useState(initialContent);
  const [tag, setTag] = useState(initialTag);
  const tags = ['General', 'Ideas', 'Personal', 'Work'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '640px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <h2 className="serif-title" style={{ fontSize: '20px', margin: 0, color: 'var(--text-main)' }}>
            {initialContent ? 'Edit note' : 'New note'}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something brilliant..."
              rows={8}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '15px',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Tag
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tags.map(t => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: tag === t ? 'var(--accent-orange)' : 'var(--border-light)',
                    backgroundColor: tag === t ? '#FFF5EC' : 'transparent',
                    color: tag === t ? '#E37A23' : 'var(--text-muted)',
                    fontWeight: tag === t ? 600 : 400,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: '#E53E3E', fontSize: '14px', fontWeight: 500, padding: '12px', backgroundColor: '#FFF5F5', borderRadius: '8px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: '#F9F9F9'
        }}>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-main)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(content, tag)}
            disabled={isSubmitting || !content.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: content.trim() ? 'var(--accent-orange)' : '#E0E0E0',
              color: content.trim() ? '#FFFFFF' : '#A0A0A0',
              fontWeight: 600,
              cursor: content.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? 'Saving...' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  );
}
