import React, { useEffect, useState } from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import type { WalletAuthState } from '../../wallet/hooks/useWalletAuth';
import WalletConnection from '../../wallet/components/WalletConnection';
import { NOTE_TAG_OPTIONS } from '../types/note';
import type { NoteFormValues, NoteTag } from '../types/note';

interface NoteFormProps {
  initialValues?: Partial<NoteFormValues>;
  isSubmitting: boolean;
  error?: string;
  onSave: (values: NoteFormValues) => void;
  onClose: () => void;
  walletAuth: WalletAuthState;
}

export default function NoteForm({
  initialValues,
  isSubmitting,
  error,
  onSave,
  onClose,
  walletAuth
}: NoteFormProps) {
  const isEditing = Boolean(initialValues);
  const requiresWallet = true;
  const [title, setTitle] = useState(initialValues?.title || '');
  const [tag, setTag] = useState<NoteTag>(initialValues?.tag || 'General');
  const [content, setContent] = useState(initialValues?.content || '');
  const isWalletMissing = requiresWallet && !walletAuth.isWalletConnected;
  const hasContent = Boolean(content.trim());
  const [toastMessage, setToastMessage] = useState("");
  const formError =
    error === disconnectedWalletMessage ? "" : error;


  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const dismissTimer = window.setTimeout(() => setToastMessage(""), 3200);
    return () => window.clearTimeout(dismissTimer);
  }, [toastMessage]);

  useEffect(() => {
    if (error === disconnectedWalletMessage) {
      setToastMessage(disconnectedWalletMessage);
    }
  }, [error]);

  function handleSave() {
    if (isWalletMissing) {
      setToastMessage(disconnectedWalletMessage);
      return;
    }

    onSave({ title, tag, content });
  }

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
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1100,
            width: 'min(360px, calc(100vw - 48px))',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#FFFFFF',
            backgroundColor: '#221811',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '13px 14px',
            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.22)',
            fontSize: '13px',
            lineHeight: 1.45,
            fontWeight: 600,
          }}
        >
          <AlertCircle
            size={16}
            style={{
              color: 'var(--accent-orange)',
              flex: '0 0 auto',
              marginTop: '1px',
            }}
          />
          <span>{toastMessage}</span>
        </div>
      )}

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
          {requiresWallet && (
            <WalletConnection
              wallets={walletAuth.wallets}
              connectedWallet={walletAuth.connectedWallet}
              isConnecting={walletAuth.isConnectingWallet}
              error={walletAuth.walletAuthError}
              onConnect={walletAuth.connectWallet}
              onDisconnect={walletAuth.disconnectWallet}
            />
          )}

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
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as NoteTag)}
              onFocus={() => setFocusedField('tag')}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle('tag')}
            >
              {NOTE_TAG_OPTIONS.map((tagOption) => (
                <option key={tagOption} value={tagOption}>
                  {tagOption}
                </option>
              ))}
            </select>
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



          {formError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                color: '#991B1B',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              <AlertCircle
                size={16}
                style={{
                  color: '#991B1B',
                  flex: '0 0 auto',
                  marginTop: '1px',
                }}
              />
              <span>{formError}</span>
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
            onClick={handleSave}
            disabled={isSubmitting || !hasContent}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#221811',
              color: '#FFFFFF',
              fontWeight: 500,
              cursor: hasContent && !isSubmitting ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: hasContent ? 1 : 0.7
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

const disconnectedWalletMessage = 'Connect your Preprod wallet before saving this note.';
