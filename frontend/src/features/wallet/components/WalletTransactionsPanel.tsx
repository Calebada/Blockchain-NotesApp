import { Activity, AlertCircle, Coins, Globe, Layers, RefreshCw, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { WalletTransactionsResponse } from '../../../types/blockchain';

interface WalletTransactionsPanelProps {
  walletTransactions: WalletTransactionsResponse | null;
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
}

function formatWalletAddress(address: string) {
  if (!address) {
    return 'No wallet address';
  }

  if (address.length <= 22) {
    return address;
  }

  return `${address.slice(0, 12)}...${address.slice(-8)}`;
}

function formatFetchedAt(value?: string) {
  if (!value) {
    return 'Waiting for sync';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function WalletTransactionsPanel({
  walletTransactions,
  isLoading,
  error,
  onRefresh,
}: WalletTransactionsPanelProps) {
  const [isRefreshHovered, setIsRefreshHovered] = useState(false);
  const transactions = walletTransactions?.transactions || [];
  const isConfigured = walletTransactions?.configured ?? true;
  const statusColor = error ? '#EF4444' : isLoading ? '#F59E0B' : '#16A34A';
  const statusTint = error ? '#FDECEA' : isLoading ? '#FEF3E2' : '#EAF7EE';

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderTop: `3px solid ${statusColor}`,
        borderRadius: '12px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #F3EFEA 0%, #E8DDD0 100%)',
              color: '#6E5A47',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
              boxShadow: 'inset 0 0 0 1px rgba(110, 90, 71, 0.08)',
            }}
          >
            <Wallet size={20} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 className="serif-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                Live wallet transactions
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: statusTint,
                  padding: '2px 8px 2px 6px',
                  borderRadius: '999px',
                }}
                title={error ? 'Wallet sync failed' : isLoading ? 'Syncing wallet' : 'Wallet synced'}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '999px',
                    backgroundColor: statusColor,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: statusColor }}>
                  {error ? 'Error' : isLoading ? 'Syncing' : 'Synced'}
                </span>
              </span>
            </div>
            <div style={{ marginTop: '5px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace' }}>{formatWalletAddress(walletTransactions?.walletAddress || '')}</span>
              <span>·</span>
              <span>Last sync {formatFetchedAt(walletTransactions?.fetchedAt)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          onMouseEnter={() => setIsRefreshHovered(true)}
          onMouseLeave={() => setIsRefreshHovered(false)}
          title="Refresh wallet transactions"
          style={{
            border: '1px solid',
            borderColor: isRefreshHovered ? 'var(--accent-orange)' : 'var(--border-light)',
            backgroundColor: isRefreshHovered ? '#FFF8F1' : '#FFFFFF',
            color: isRefreshHovered ? 'var(--accent-orange-hover)' : 'var(--text-main)',
            borderRadius: '8px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            flex: '0 0 auto',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw
            size={16}
            style={{
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
        }}
      >
        <SummaryMetric
          icon={<Coins size={20} />}
          label="Available ADA"
          value={`${walletTransactions?.totalAda || '0.000000'} ADA`}
          iconColor="#B8722C"
          iconBg="#F5DDBB"
          primary
        />
        <SummaryMetric
          icon={<Layers size={20} />}
          label="UTXO entries"
          value={String(walletTransactions?.transactionCount || 0)}
          iconColor="#6E5A47"
          iconBg="#E8DED0"
        />
        <SummaryMetric
          icon={<Globe size={20} />}
          label="Network"
          value={walletTransactions?.network || 'Unknown'}
          iconColor="#3F6BAB"
          iconBg="#D6E4FA"
        />
      </div>

      {error ? (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', backgroundColor: '#FEE2E2', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', fontWeight: 500 }}>
          <AlertCircle size={15} />
          {error}
        </div>
      ) : !isConfigured ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92600D', backgroundColor: '#FEF3E2', border: '1px solid #F5D9A8', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
          <AlertCircle size={15} />
          Backend wallet address is not configured.
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', backgroundColor: '#F8F4EF', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
          {isLoading ? 'Syncing wallet transactions...' : 'No wallet UTXOs found.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto', paddingRight: '2px' }}>
          {transactions.map((transaction) => (
            <div
              key={`${transaction.txHash}-${transaction.outputIndex}`}
              className="card-hover"
              style={{
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '12px',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  backgroundColor: '#F3EFEA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 auto',
                }}>
                  <Activity size={14} color="#8C7C6D" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {transaction.txHashShort || transaction.txHash}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Output #{transaction.outputIndex} · {transaction.assetCount} {transaction.assetCount === 1 ? 'asset' : 'assets'}
                  </div>
                </div>
              </div>

              <strong style={{ fontSize: '13px', color: 'var(--accent-orange-hover)', whiteSpace: 'nowrap' }}>
                {transaction.ada} ADA
              </strong>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

function SummaryMetric({ icon, label, value, primary, iconColor, iconBg }: { icon: React.ReactNode; label: string; value: string; primary?: boolean; iconColor: string; iconBg: string }) {
  return (
    <div style={{
      backgroundColor: primary ? '#FDF3E9' : '#F8F4EF',
      border: primary ? '1px solid #F0D9BC' : '1px solid transparent',
      borderRadius: '10px',
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        backgroundColor: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10.5px', color: primary ? 'var(--accent-orange-hover)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.3px' }}>
          {label}
        </div>
        <div style={{ marginTop: '3px', fontSize: primary ? '17px' : '15px', color: 'var(--text-main)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
