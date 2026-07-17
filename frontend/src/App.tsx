import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Blocks, CheckCircle2, Hash, Loader2, Plus, ShieldCheck } from "lucide-react";

type Note = {
  author: string;
  content: string;
  securedAt?: string;
};

type ChainBlock = {
  index: number;
  timestamp: string;
  note: Note;
  previousHash: string;
  hash: string;
};

type ChainResponse = {
  valid: boolean;
  length: number;
  chain: ChainBlock[];
};

const API_URL = "http://localhost:5000/api";

function shortenHash(hash: string) {
  if (hash.length <= 18) {
    return hash;
  }

  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function App() {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [chain, setChain] = useState<ChainBlock[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const noteBlocks = useMemo(() => chain.filter((block) => block.index !== 0), [chain]);

  async function fetchChain() {
    setError("");

    try {
      const response = await axios.get<ChainResponse>(`${API_URL}/chain`);
      setChain(response.data.chain);
      setIsValid(response.data.valid);
    } catch {
      setError("Unable to reach the backend. Start the API on port 5000.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setError("Write a note before securing it.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await axios.post(`${API_URL}/notes`, {
        author: author.trim() || "anonymous",
        content: content.trim(),
      });

      setContent("");
      await fetchChain();
    } catch {
      setError("The note could not be added. Check the API and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    fetchChain();
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Local hash-linked ledger</p>
            <h1 style={styles.title}>Blockchain Notes</h1>
            <p style={styles.subtitle}>
              Secure notes into immutable-looking blocks with SHA-256 hashes and previous-hash links.
            </p>
          </div>
          <div style={styles.statusCard}>
            <ShieldCheck size={22} />
            <div>
              <strong>{isValid ? "Chain valid" : "Chain warning"}</strong>
              <span>{chain.length} total blocks</span>
            </div>
          </div>
        </header>

        <section style={styles.grid}>
          <form onSubmit={handleSubmit} style={styles.panel}>
            <div style={styles.panelTitle}>
              <Plus size={20} />
              <h2>Add secured note</h2>
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
                placeholder="Write something worth protecting..."
                rows={7}
                style={{ ...styles.input, ...styles.textarea }}
              />
            </label>

            {error && <p style={styles.error}>{error}</p>}

            <button disabled={isSubmitting} style={styles.button}>
              {isSubmitting ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
              {isSubmitting ? "Securing..." : "Secure note"}
            </button>
          </form>

          <section style={styles.panel}>
            <div style={styles.panelTitle}>
              <Blocks size={20} />
              <h2>Chain explorer</h2>
            </div>

            {isLoading ? (
              <div style={styles.emptyState}>Loading blockchain...</div>
            ) : noteBlocks.length === 0 ? (
              <div style={styles.emptyState}>No notes yet. Add the first block to begin the chain.</div>
            ) : (
              <div style={styles.blockList}>
                {noteBlocks.map((block) => (
                  <article key={block.hash} style={styles.blockCard}>
                    <div style={styles.blockTopline}>
                      <span style={styles.blockIndex}>Block #{block.index}</span>
                      <span>{new Date(block.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={styles.note}>{block.note.content}</p>
                    <p style={styles.author}>By {block.note.author}</p>
                    <div style={styles.hashRows}>
                      <HashRow label="Previous" value={block.previousHash} />
                      <HashRow label="Current" value={block.hash} />
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

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f8fb",
    color: "#172033",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  shell: {
    width: "min(1120px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "48px 0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
    marginBottom: 28,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: "0 0 8px",
    color: "#516079",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(36px, 6vw, 64px)",
    lineHeight: 1,
  },
  subtitle: {
    maxWidth: 620,
    margin: "14px 0 0",
    color: "#5d6b82",
    fontSize: 17,
    lineHeight: 1.6,
  },
  statusCard: {
    minWidth: 190,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    border: "1px solid #d9e0ea",
    borderRadius: 8,
    background: "#ffffff",
    boxShadow: "0 12px 30px rgba(23, 32, 51, 0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
    gap: 24,
    alignItems: "start",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 16px 40px rgba(23, 32, 51, 0.08)",
  },
  panelTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  label: {
    display: "grid",
    gap: 8,
    marginBottom: 16,
    color: "#344055",
    fontSize: 14,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cfd7e3",
    borderRadius: 8,
    padding: "12px 14px",
    color: "#172033",
    font: "inherit",
    outline: "none",
  },
  textarea: {
    resize: "vertical",
    minHeight: 150,
    lineHeight: 1.5,
  },
  button: {
    width: "100%",
    border: 0,
    borderRadius: 8,
    padding: "13px 16px",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    background: "#1f7a6b",
    color: "#ffffff",
    font: "inherit",
    fontWeight: 800,
    cursor: "pointer",
  },
  error: {
    margin: "0 0 14px",
    color: "#b42318",
    fontWeight: 700,
  },
  emptyState: {
    padding: 28,
    border: "1px dashed #cfd7e3",
    borderRadius: 8,
    color: "#66758d",
    textAlign: "center",
  },
  blockList: {
    display: "grid",
    gap: 14,
  },
  blockCard: {
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    padding: 16,
    background: "#fbfcfe",
  },
  blockTopline: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#66758d",
    fontSize: 13,
    flexWrap: "wrap",
  },
  blockIndex: {
    color: "#1f7a6b",
    fontWeight: 800,
  },
  note: {
    margin: "12px 0 8px",
    fontSize: 16,
    lineHeight: 1.6,
  },
  author: {
    margin: "0 0 14px",
    color: "#66758d",
    fontSize: 14,
  },
  hashRows: {
    display: "grid",
    gap: 8,
  },
  hashRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 10px",
    borderRadius: 8,
    background: "#eef3f7",
    color: "#445169",
    fontSize: 13,
    flexWrap: "wrap",
  },
  hashLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 700,
  },
};
