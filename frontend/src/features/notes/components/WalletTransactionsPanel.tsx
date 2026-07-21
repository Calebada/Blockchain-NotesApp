import { Activity, RefreshCw, Wallet } from 'lucide-react';
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
  const transactions = walletTransactions?.transactions || [];
  const isConfigured = walletTransactions?.configured ?? true;
  const statusColor = error ? '#EF4444' : isLoading ? '#F59E0B' : '#16A34A';

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#F3EFEA',
              color: '#6E5A47',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <Wallet size={19} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Live wallet transactions
              </h3>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '999px',
                  backgroundColor: statusColor,
                  display: 'inline-block',
                }}
                title={error ? 'Wallet sync failed' : isLoading ? 'Syncing wallet' : 'Wallet synced'}
              />
            </div>
            <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>{formatWalletAddress(walletTransactions?.walletAddress || '')}</span>
              <span>Last sync {formatFetchedAt(walletTransactions?.fetchedAt)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh wallet transactions"
          style={{
            border: '1px solid var(--border-light)',
            backgroundColor: '#FFFFFF',
            color: 'var(--text-main)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            flex: '0 0 auto',
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
        }}
      >
        <SummaryMetric label="Available ADA" value={`${walletTransactions?.totalAda || '0.000000'} ADA`} />
        <SummaryMetric label="UTXO entries" value={String(walletTransactions?.transactionCount || 0)} />
        <SummaryMetric label="Network" value={walletTransactions?.network || 'Unknown'} />
      </div>

      {error ? (
        <div role="alert" style={{ color: '#991B1B', backgroundColor: '#FEE2E2', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', fontWeight: 500 }}>
          {error}
        </div>
      ) : !isConfigured ? (
        <div style={{ color: 'var(--text-muted)', backgroundColor: '#F8F4EF', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
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
                <Activity size={16} color="#8C7C6D" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {transaction.txHashShort || transaction.txHash}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Output #{transaction.outputIndex} - {transaction.assetCount} {transaction.assetCount === 1 ? 'asset' : 'assets'}
                  </div>
                </div>
              </div>

              <strong style={{ fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                {transaction.ada} ADA
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: '#F8F4EF', borderRadius: '8px', padding: '12px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: '6px', fontSize: '15px', color: 'var(--text-main)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  );
}
