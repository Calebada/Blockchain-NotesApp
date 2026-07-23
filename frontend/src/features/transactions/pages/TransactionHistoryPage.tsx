import type { CSSProperties } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, FilePenLine, Loader2, RotateCcw, ShieldCheck, Trash2, Wallet, XCircle } from 'lucide-react';
import type { NoteActivity, NoteActivityAction, ProofVerificationResult } from '../../../types/blockchain';
import type { WalletAuthState } from '../../wallet/hooks/useWalletAuth';
import WalletConnection, { formatWalletAddress } from '../../wallet/components/WalletConnection';

interface TransactionHistoryPageProps {
  activity: NoteActivity[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  error: string;
  walletAuth: WalletAuthState;
  onPageChange: (page: number) => void;
  onRetryNoteSave: (activityId: string) => Promise<void>;
  onVerifyProof: (activityId: string) => Promise<void>;
  proofActionErrors: Record<string, string>;
  proofVerifications: Record<string, ProofVerificationResult>;
  retryingActivityIds: ReadonlySet<string>;
  verifyingProofIds: ReadonlySet<string>;
}

const ACTION_LABELS: Record<NoteActivityAction, string> = {
  CREATE_NOTE: 'Created note',
  UPDATE_NOTE: 'Updated note',
  DELETE_NOTE: 'Moved to trash',
  RESTORE_NOTE: 'Restored note',
  PERMANENT_DELETE_NOTE: 'Deleted forever',
};

function getActivityIcon(action: NoteActivityAction) {
  if (action === 'RESTORE_NOTE') {
    return <RotateCcw size={18} />;
  }

  if (action === 'DELETE_NOTE' || action === 'PERMANENT_DELETE_NOTE') {
    return <Trash2 size={18} />;
  }

  return <FilePenLine size={18} />;
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatHash(value: string) {
  if (value.length <= 20) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-10)}`;
}

function getStatusColors(status: NoteActivity['confirmationStatus']) {
  if (status === 'Confirmed') {
    return { background: '#DCFCE7', foreground: '#166534' };
  }

  if (status === 'Failed') {
    return { background: '#FEE2E2', foreground: '#991B1B' };
  }

  return { background: '#FEF3C7', foreground: '#92400E' };
}

function getExplorerUrl(entry: NoteActivity) {
  return entry.cardanoTxHash && entry.network === 'preprod'
    ? `https://preprod.cardanoscan.io/transaction/${entry.cardanoTxHash}`
    : '';
}

export default function TransactionHistoryPage({
  activity,
  pagination,
  error,
  walletAuth,
  onPageChange,
  onRetryNoteSave,
  onVerifyProof,
  proofActionErrors,
  proofVerifications,
  retryingActivityIds,
  verifyingProofIds,
}: TransactionHistoryPageProps) {
  const connectedWallet = walletAuth.connectedWallet;
  const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div
      style={{
        marginLeft: '260px',
        padding: '48px 56px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'flex-start' }}>
        <div>
          <h2 className="serif-title" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Transaction history
          </h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {connectedWallet ? `${pagination.total} tracked ${pagination.total === 1 ? 'action' : 'actions'}` : 'Wallet connection required'}
          </span>
        </div>

        {connectedWallet && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'monospace' }}>
            <Wallet size={16} />
            {formatWalletAddress(connectedWallet.address)}
          </div>
        )}
      </div>

      {!connectedWallet ? (
        <section
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>
              Connect wallet to view transaction history
            </h3>
            <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
              History is scoped to the wallet that performed the note actions.
            </p>
          </div>

          <WalletConnection
            wallets={walletAuth.wallets}
            connectedWallet={walletAuth.connectedWallet}
            isConnecting={walletAuth.isConnectingWallet}
            error={walletAuth.walletAuthError}
            onConnect={walletAuth.connectWallet}
            onDisconnect={walletAuth.disconnectWallet}
          />
        </section>
      ) : error ? (
        <div role="alert" style={{ color: '#991B1B', backgroundColor: '#FEE2E2', borderRadius: '8px', padding: '14px 16px', fontSize: '14px', fontWeight: 500 }}>
          {error}
        </div>
      ) : activity.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', backgroundColor: '#F8F4EF', borderRadius: '8px', padding: '16px', fontSize: '14px' }}>
          No tracked note actions for this wallet yet.
        </div>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activity.map((entry) => {
            const statusColors = getStatusColors(entry.confirmationStatus);
            const explorerUrl = getExplorerUrl(entry);
            const verification = proofVerifications[entry.id];
            const proofError = proofActionErrors[entry.id];
            const isVerifying = verifyingProofIds.has(entry.id);
            const isRetrying = retryingActivityIds.has(entry.id);

            return (
            <div
              key={entry.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '16px 18px',
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: '14px',
                alignItems: 'center',
              }}
            >
              <div style={{ color: '#8C7C6D', display: 'flex', alignItems: 'center' }}>
                {getActivityIcon(entry.action)}
              </div>

              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>
                  {ACTION_LABELS[entry.action]}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.noteTitle || 'Untitled note'} {entry.noteTag ? `#${entry.noteTag.toLowerCase()}` : ''}
                </div>
                {entry.proofHash && (
                  <div
                    title={entry.proofHash}
                    style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
                  >
                    Proof hash {formatHash(entry.proofHash)}
                  </div>
                )}
                {entry.cardanoTxHash && (
                  <div
                    title={entry.cardanoTxHash}
                    style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
                  >
                    Cardano transaction {formatHash(entry.cardanoTxHash)}
                  </div>
                )}
                {entry.cardanoBlockHash && (
                  <div
                    title={entry.cardanoBlockHash}
                    style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
                  >
                    Cardano block {entry.cardanoBlockHeight !== null ? `#${entry.cardanoBlockHeight} ` : ''}
                    {formatHash(entry.cardanoBlockHash)}
                  </div>
                )}
                {entry.cardanoBlockSlot !== null && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Slot {entry.cardanoBlockSlot}
                    {entry.cardanoBlockEpoch !== null ? ` · epoch ${entry.cardanoBlockEpoch}` : ''}
                  </div>
                )}
                {entry.noteSaveStatus === 'Failed' && (
                  <div style={{ marginTop: '5px', color: '#9A3412', fontSize: '12px', fontWeight: 700 }}>
                    Blockchain transaction succeeded; note save failed.
                    {entry.noteSaveError ? ` ${entry.noteSaveError}` : ''}
                  </div>
                )}
                {verification && (
                  <ProofVerificationSummary verification={verification} />
                )}
                {proofError && (
                  <div role="alert" style={{ marginTop: '5px', color: '#991B1B', fontSize: '12px' }}>
                    {proofError}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', minWidth: '150px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    backgroundColor: statusColors.background,
                    color: statusColors.foreground,
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {entry.confirmationStatus}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatActivityDate(entry.createdAt)}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {entry.network}
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      marginTop: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#9A5B35',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    View on explorer <ExternalLink size={12} />
                  </a>
                )}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => void onVerifyProof(entry.id)}
                    disabled={isVerifying || !entry.cardanoTxHash || !entry.proofHash}
                    style={actionButtonStyle(isVerifying || !entry.cardanoTxHash || !entry.proofHash)}
                  >
                    {isVerifying ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    {isVerifying ? 'Verifying...' : 'Verify proof'}
                  </button>
                  {entry.noteSaveStatus === 'Failed' && (
                    <button
                      type="button"
                      onClick={() => void onRetryNoteSave(entry.id)}
                      disabled={isRetrying}
                      style={actionButtonStyle(isRetrying)}
                    >
                      {isRetrying ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      {isRetrying ? 'Retrying...' : 'Retry saving note'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              paddingTop: '8px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <span>
              Showing {firstItem}-{lastItem} of {pagination.total}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
                aria-label="Previous transaction page"
                style={paginationButtonStyle(!pagination.hasPreviousPage)}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ minWidth: '72px', textAlign: 'center' }}>
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                aria-label="Next transaction page"
                style={paginationButtonStyle(!pagination.hasNextPage)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ProofVerificationSummary({
  verification,
}: {
  verification: ProofVerificationResult;
}) {
  const checks = [
    ['Transaction exists', verification.transactionExists],
    ['Metadata proof hash matches', verification.metadataMatches],
    ['Recorded action matches', verification.actionMatches],
  ] as const;

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '9px 10px',
        borderRadius: '7px',
        backgroundColor: verification.verified ? '#F0FDF4' : '#FEF2F2',
        color: verification.verified ? '#166534' : '#991B1B',
        fontSize: '11px',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '4px' }}>{verification.message}</div>
      {checks.map(([label, passed]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
          {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {label}
        </div>
      ))}
    </div>
  );
}

function actionButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    padding: '6px 8px',
    backgroundColor: disabled ? '#F3F0EC' : '#FFFFFF',
    color: disabled ? '#B8AEA4' : '#7C3F1D',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function paginationButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: '34px',
    height: '34px',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    backgroundColor: disabled ? '#F3F0EC' : '#FFFFFF',
    color: disabled ? '#B8AEA4' : 'var(--text-main)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
