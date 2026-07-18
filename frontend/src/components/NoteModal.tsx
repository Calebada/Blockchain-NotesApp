import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { NoteFormValues } from '../types/blockchain';

interface NoteModalProps {
  initialValues?: Partial<NoteFormValues>;
  isSubmitting: boolean;
  error?: string;
  onSave: (values: NoteFormValues) => void;
  onClose: () => void;
}

export default function NoteModal({
  initialValues,
  isSubmitting,
  error,
  onSave,
  onClose
}: NoteModalProps) {
  const isEditing = Boolean(initialValues);
  const [title, setTitle] = useState(initialValues?.title || '');
  const [tag, setTag] = useState(initialValues?.tag || 'General');
  const [content, setContent] = useState(initialValues?.content || '');


  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getInputStyle = (fieldName: string) => ({
    width: '100%',
    padding: '12px 14px',
    border: '1px solid',
    borderColor: focusedField === fieldName ? 'var(--accent-orange)' : '#E8DCCF',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    color: 'var(--text-main)',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  });

  const getLabelStyle = () => ({
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#4A443E',
    marginBottom: '8px',
  });

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
        backgroundColor: '#FDFAF4',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '24px 24px 16px 24px',
        }}>
          <div>
            <h2 className="serif-title" style={{ fontSize: '24px', margin: '0 0 4px 0', color: 'var(--text-main)', fontWeight: 700 }}>
              {isEditing ? 'Edit note' : 'New note'}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Capture the thought before it drifts.
            </p>
          </div>
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
            <X size={18} />
          </button>
        </div>


        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={getLabelStyle()}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle('title')}
            />
          </div>

          <div>
            <label style={getLabelStyle()}>Tag</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onFocus={() => setFocusedField('tag')}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle('tag')}
            />
          </div>

          <div>
            <label style={getLabelStyle()}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocusedField('content')}
              onBlur={() => setFocusedField(null)}
              placeholder="Start writing..."
              rows={6}
              style={{
                ...getInputStyle('content'),
                resize: 'vertical',
                minHeight: '120px'
              }}
            />
          </div>



          {error && (
            <div style={{ marginTop: '8px', marginBottom: '8px' }}>
              <span style={{
                color: '#FFFFFF',
                backgroundColor: '#5C7CFA',
                fontSize: '13px',
                padding: '2px 4px',
                lineHeight: 1.5,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone'
              }}>
                {error}
              </span>
            </div>
          )}
        </div>


        <div style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: '#FDFAF4'
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '14px',
              padding: '8px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ title, tag, content })}
            disabled={isSubmitting || !content.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#221811',
              color: '#FFFFFF',
              fontWeight: 500,
              cursor: content.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: content.trim() ? 1 : 0.7
            }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? 'Update note' : 'Create note'}
          </button>
        </div>
      </div>
    </div>
  );
}
