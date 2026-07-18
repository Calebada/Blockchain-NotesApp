import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Blocks, CheckCircle2, DatabaseZap, Hash, Loader2, Plus, RadioTower, ShieldCheck } from "lucide-react";
import { addNote, fetchChain, getApiError } from "./api/blockchainApi";
import { styles } from "./styles";
import type { BlockfrostProvider, CardanoBlock, ChainBlock } from "./types/blockchain";
import { shortenHash } from "./utils/hash";

export default function App() {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [chain, setChain] = useState<ChainBlock[]>([]);
  const [provider, setProvider] = useState<BlockfrostProvider | null>(null);
  const [latestBlock, setLatestBlock] = useState<CardanoBlock | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sortedBlocks = useMemo(() => [...chain].reverse(), [chain]);

  async function loadChain() {
    setError("");

    try {
      const chainState = await fetchChain();
      setChain(chainState.chain);
      setProvider(chainState.provider);
      setLatestBlock(chainState.latestBlock);
      setIsValid(chainState.valid);
    } catch (requestError) {
      setError(
        getApiError(
          requestError,
          "Unable to reach the backend. Start the API on port 5000 and configure Blockfrost."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setError("Write a note before anchoring it.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await addNote({
        author: author.trim() || "anonymous",
        content: content.trim(),
      });

      setContent("");
      await loadChain();
    } catch (requestError) {
      setError(getApiError(requestError, "The note could not be anchored. Check Blockfrost and try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    loadChain();
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Blockfrost Cardano provider</p>
            <h1 style={styles.title}>Blockchain Notes</h1>
            <p style={styles.subtitle}>
              Hash notes locally and anchor each record to the latest Cardano block returned by Blockfrost.
            </p>
          </div>
          <div style={styles.statusGrid}>
            <StatusPill
              icon={<RadioTower size={20} />}
              label={provider?.network ? `${provider.network} network` : "Network pending"}
              value={provider?.configured ? "Blockfrost ready" : "Needs project_id"}
            />
            <StatusPill
              icon={<ShieldCheck size={20} />}
              label={isValid ? "Ledger valid" : "Ledger warning"}
              value={`${chain.length} anchored notes`}
            />
          </div>
        </header>

        <section style={styles.chainBand}>
          <div style={styles.chainBandTitle}>
            <DatabaseZap size={20} />
            <h2>Latest Cardano block</h2>
          </div>
          {latestBlock ? (
            <div style={styles.chainStats}>
              <Metric label="Height" value={latestBlock.height.toLocaleString()} />
              <Metric label="Epoch" value={latestBlock.epoch.toLocaleString()} />
              <Metric label="Slot" value={latestBlock.slot.toLocaleString()} />
              <Metric label="Transactions" value={latestBlock.txCount.toLocaleString()} />
              <div style={styles.wideMetric}>
                <span>Block hash</span>
                <code title={latestBlock.hash}>{shortenHash(latestBlock.hash)}</code>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              {isLoading ? "Loading Cardano block state..." : "Blockfrost block state is unavailable."}
            </div>
          )}
        </section>

        <section style={styles.grid}>
          <form onSubmit={handleSubmit} style={styles.panel}>
            <div style={styles.panelTitle}>
              <Plus size={20} />
              <h2>Add anchored note</h2>
            </div>

            <label style={styles.label}>
              Author
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="anonymous"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Note
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write something worth anchoring..."
                rows={7}
                style={{ ...styles.input, ...styles.textarea }}
              />
            </label>

            {error && <p style={styles.error}>{error}</p>}

            <button disabled={isSubmitting} style={styles.button}>
              {isSubmitting ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
              {isSubmitting ? "Anchoring..." : "Anchor note"}
            </button>
          </form>

          <section style={styles.panel}>
            <div style={styles.panelTitle}>
              <Blocks size={20} />
              <h2>Anchored notes</h2>
            </div>

            {isLoading ? (
              <div style={styles.emptyState}>Loading notes...</div>
            ) : sortedBlocks.length === 0 ? (
              <div style={styles.emptyState}>No notes yet. Add the first note to anchor it to Cardano.</div>
            ) : (
              <div style={styles.blockList}>
                {sortedBlocks.map((block) => (
                  <article key={block.hash} style={styles.blockCard}>
                    <div style={styles.blockTopline}>
                      <span style={styles.blockIndex}>Note #{block.index}</span>
                      <span>{new Date(block.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={styles.note}>{block.note.content}</p>
                    <p style={styles.author}>By {block.note.author}</p>
                    <div style={styles.anchorSummary}>
                      <span>Anchored at Cardano block {block.anchor.blockHeight.toLocaleString()}</span>
                      <span>{block.anchor.network}</span>
                    </div>
                    <div style={styles.hashRows}>
                      <HashRow label="Anchor" value={block.anchor.blockHash} />
                      <HashRow label="Note hash" value={block.hash} />
                      <HashRow label="Previous" value={block.previousHash} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={styles.statusCard}>
      {icon}
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.hashRow}>
      <span style={styles.hashLabel}>
        <Hash size={14} />
        {label}
      </span>
      <code title={value}>{shortenHash(value)}</code>
    </div>
  );
}
