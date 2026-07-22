# Blockchain Notes App

A full-stack notes application that publishes **privacy-preserving proofs** of every note action to the **Cardano Preprod testnet**. Note content itself never leaves Supabase — only a SHA-256 hash and an action label (create / update / delete / restore) are anchored on-chain, giving every change a tamper-evident, publicly verifiable timestamp without exposing what the note actually says.

---

## Table of Contents

- [Overview](#overview)
- [How the Blockchain Flow Works](#how-the-blockchain-flow-works)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Prerequisites](#prerequisites)
- [Blockfrost Setup](#blockfrost-setup)
- [Supabase Setup](#supabase-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Eternl Preprod Wallet Setup](#eternl-preprod-wallet-setup)
- [Development Flow](#development-flow)
- [Screenshots](#screenshots)
- [Presenting This Project](#presenting-this-project)

---

## Overview

Notes are created and edited through a normal, editorial-styled notes UI. Behind the scenes, every note action triggers a small Cardano transaction:

1. The note's content is hashed (SHA-256) — the hash, not the content, is what gets recorded.
2. That hash plus an action label is placed into the transaction's **metadata**.
3. The connected CIP-30 wallet (e.g. Eternl) signs the transaction.
4. Blockfrost submits it to the Cardano Preprod network and later confirms it.
5. The app's **Transaction History** view tracks the transaction from `Pending` → `Confirmed` (or `Failed`), showing the confirmed block hash, block height, network, and a link to view it on a Preprod explorer.

This means the notes app can prove *"this exact note content existed, unchanged, at this point in time"* without ever putting private note content on a public ledger.

## How the Blockchain Flow Works

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐     ┌────────────────┐
│  Note edit   │ --> │ SHA-256 hash the  │ --> │ Build unsigned │ --> │ Wallet (CIP-30) │
│  in the app  │     │ note content      │     │ Cardano tx     │     │ signs the tx    │
└─────────────┘     └──────────────────┘     └───────────────┘     └────────────────┘
                                                                              │
                                                                              v
┌────────────────┐     ┌───────────────────┐     ┌───────────────────────────────────┐
│ Transaction     │ <-- │ Blockfrost confirms│ <-- │ Blockfrost submits signed tx to    │
│ History updates │     │ block + status     │     │ Cardano Preprod                    │
└────────────────┘     └───────────────────┘     └───────────────────────────────────┘
```

Key design decisions:

- **`proofHash` vs `cardanoTxHash`** are tracked separately. `proofHash` is the SHA-256 of the note content; `cardanoTxHash` is the actual Cardano transaction ID once it's submitted. Keeping these distinct makes it clear what's being proven versus what's the on-chain reference.
- **Only the fee is spent.** Each transaction spends the minimal network fee from test ADA and returns the rest to the wallet — no real value is transferred, and no mainnet ADA is ever required (mainnet is intentionally disabled for this project).
- **Note content stays private.** Titles and note bodies are never included in Cardano metadata; only the hash and action name are.
- **Pending transactions are re-checked automatically.** Whenever Transaction History loads, any `Pending` entries are checked against Blockfrost — confirmed ones get their block hash/height filled in, and unconfirmed ones that have expired become `Failed`.

## Project Structure

```text
.
|-- backend
|   |-- blockchain.js
|   |-- package.json
|   |-- server.js
|   `-- src
|       |-- application
|       |   `-- notes-ledger.js
|       |-- app.js
|       |-- common
|       |   `-- app-error.js
|       |-- config
|       |   |-- blockfrost-config.js
|       |   `-- env.js
|       |-- domain
|       |   `-- note-block.js
|       |-- http
|       |   |-- controllers
|       |   |-- middleware
|       |   `-- routes
|       `-- services
|           |-- blockfrost
|           |-- cardano
|           |-- logging
|           `-- persistence
|-- frontend
|   |-- index.html
|   |-- package.json
|   |-- src
|   |   |-- App.tsx
|   |   |-- config
|   |   |   `-- api.ts
|   |   |-- features
|   |   |   `-- notes
|   |   |       |-- components
|   |   |       |-- hooks
|   |   |       |-- pages
|   |   |       |-- services
|   |   |       `-- types
|   |   |-- main.tsx
|   |   |-- types
|   |   |   `-- blockchain.ts
|   |   `-- vite-env.d.ts
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- .gitignore
`-- README.md
```

## Architecture

| Layer | Responsibility |
|---|---|
| `backend/src/domain` | Note-block creation and hash validation — pure logic, no framework dependencies. |
| `backend/src/application` | Coordinates note use cases (create/edit/delete/restore) through injected provider, persistence, and logging dependencies. |
| `backend/src/services` | Cardano transaction builder, Blockfrost SDK adapter, persistence adapters, and transaction logger. |
| `backend/src/http` | Express controllers, routes, payload parsing, and centralized error middleware. |
| `backend/src/app.js` | Composition root — wires dependencies together. `backend/server.js` only loads configuration and starts the HTTP listener. |
| `frontend/src/features/notes` | Owns note components, API calls, feature types, pages, and state orchestration. |
| `frontend/src/App.tsx` | Selects the feature page to render. |
| `frontend/src/config` | Deployment-specific configuration (API base URL, etc). |

This layering keeps blockchain/Blockfrost logic, persistence, and HTTP concerns separated, so each piece can be tested or swapped independently (e.g. Supabase could be replaced with another store without touching the domain or Cardano logic).

## Tech Stack & Dependencies

**Frontend**
- React + TypeScript, built with Vite
- CIP-30 wallet API (via browser wallet extensions like Eternl) for signing transactions
- `lucide-react` for icons

**Backend**
- Node.js + Express
- `@blockfrost/blockfrost-js` SDK — request throttling, retries, timeouts, structured errors
- Supabase (`@supabase/supabase-js`) for persistent storage, with an in-memory fallback for local development without Supabase configured

**Blockchain**
- Cardano Preprod testnet only (mainnet intentionally disabled)
- Blockfrost as the Cardano data provider/submission endpoint

## Prerequisites

- Node.js 18 or newer
- npm
- A Cardano Preprod Blockfrost project
- A Supabase project
- Eternl or another CIP-30 browser wallet configured for Preprod
- Preprod test ADA from a Cardano testnet faucet

## Blockfrost Setup

1. Create a Blockfrost account and project.
2. Choose **Cardano Preprod** for the project.
3. Copy the generated `project_id`.
4. Create a local `backend/.env` file.
5. Set the values:

```bash
BLOCKFROST_PROJECT_ID=preprod_your_project_id_here
BLOCKFROST_NETWORK=preprod
PORT=5000
```

`preprod` is the only supported network. Mainnet is intentionally disabled so this school project never requires real ADA.

Keep `BLOCKFROST_PROJECT_ID` out of frontend code and commits.

The backend initializes `BlockFrostAPI` with the configured project ID and network. The SDK provides request throttling, retries, timeouts, and structured Blockfrost errors. `BLOCKFROST_API_URL` is optional and should only be set when using a compatible custom backend. The frontend sends the connected browser wallet address to the backend for live UTXO checks, so the wallet shown in the dashboard is the wallet you connected.

## Supabase Setup

1. Copy your project URL and service role key from the Supabase dashboard.
2. Add the values to `backend/.env`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_backend_only_service_role_key
SUPABASE_NOTES_TABLE=notes
```

Keep `SUPABASE_SERVICE_ROLE_KEY` in the backend only. If Supabase variables are omitted, the app falls back to in-memory storage for local development. The `notes` table stores note content. The `note_activity` table stores wallet-scoped audit entries with separate `proof_hash` and `cardano_tx_hash` fields, confirmation status, expiry slot, and confirmed block details.

To create the table automatically from the repo, copy the Supabase Postgres connection string into `backend/.env`:

```bash
SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-password@aws-0-region.pooler.supabase.com:6543/postgres
```

Then run:

```bash
cd backend
npm run db:setup
```

You can also run `backend/supabase/schema.sql` manually in the Supabase SQL editor.

Run the schema again when upgrading an existing database. It copies legacy `transaction_id` values into `proof_hash` and adds the real Cardano transaction fields without deleting existing history.

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

Available endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/chain` | Fetch local anchored notes plus the latest Cardano block from Blockfrost |
| `GET` | `/api/notes/trash` | Fetch soft-deleted notes |
| `GET` | `/api/activity` | Fetch recent note activity tracked by connected wallet address |
| `POST` | `/api/transactions/prepare` | Build an unsigned Preprod metadata transaction from CIP-30 wallet UTXOs |
| `POST` | `/api/transactions/submit` | Assemble wallet witnesses and submit the signed transaction through Blockfrost |
| `POST` | `/api/notes` | Add a note — JSON body `{ "author": "Ada", "content": "My secured note" }` |
| `PUT` | `/api/notes/:id` | Edit a note — JSON body `{ "author": "Ada", "content": "Updated note" }` |
| `DELETE` | `/api/notes/:id` | Soft delete a note by moving it to Trash and recalculating the local proof chain |
| `POST` | `/api/notes/:id/restore` | Restore a soft-deleted note |
| `DELETE` | `/api/notes/:id/permanent` | Permanently delete a note from storage |
| `GET` | `/api/health` | Check API and provider configuration |

## Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`.

## Eternl Preprod Wallet Setup

1. Switch Eternl to the **Preprod** testnet and select a dApp account.
2. Fund that account with test ADA from a Cardano Preprod faucet.
3. Open the app and connect Eternl.
4. Create, edit, delete, or restore a note and approve the transaction prompt.
5. Open **Transaction history** to follow it from `Pending` to `Confirmed` and use the explorer link.

The transaction spends only the network fee from test ADA and sends the remaining value back to the wallet. The note title and content are never included in Cardano metadata.

## Development Flow

1. Start the backend from `/backend`.
2. Start the frontend from `/frontend`.
3. Connect a funded Preprod wallet.
4. Add or change a note and approve the wallet transaction.
5. Inspect the proof hash, Cardano transaction ID, status, and confirmed block in Transaction History.

With Supabase configured, restarting the backend preserves note activity and confirmation state. Pending entries are checked against Blockfrost whenever activity loads; confirmed entries receive their Cardano block hash and height, while expired unconfirmed transactions become `Failed`.

## Screenshots

> Add screenshots here before presenting — a few that work well:
>
> - **All Notes view** — the main note grid with tag-colored cards
> - **Live Wallet Transactions panel** — Available ADA / UTXO entries / Network stats
> - **Transaction History** — a note action moving from `Pending` to `Confirmed`, with the Preprod explorer link
> - **Wallet connection** — the sidebar wallet card before and after connecting Eternl
>
> ```markdown
> ![All Notes view](docs/screenshots/all-notes.png)
> ![Wallet transactions panel](docs/screenshots/wallet-panel.png)
> ![Transaction history](docs/screenshots/transaction-history.png)
> ```
>
> Save images under a `docs/screenshots/` folder in the repo and update the paths above to match.

## Presenting This Project

A few talking points that map directly to what a professor or panel is likely to ask:

- **"Why hash the note instead of storing it on-chain?"** — Cardano transaction metadata is public and permanent. Storing raw note content on-chain would make private notes world-readable forever. Hashing lets you *prove* a note existed in a given state without exposing it.
- **"What happens if two people edit at once?"** — Each edit produces its own proof hash and its own transaction, so the on-chain record is an ordered history of every version, not just the latest one.
- **"Why Preprod and not Mainnet?"** — Preprod is Cardano's public testnet: same functionality as Mainnet, but transactions use free test ADA from a faucet instead of real funds. Mainnet is disabled in this project specifically so no real money is ever at risk.
- **"What does Blockfrost actually do here?"** — Blockfrost is a hosted Cardano node API. Instead of running a full Cardano node, the backend calls Blockfrost to fetch UTXOs, submit signed transactions, and check confirmation status.
- **"What's the role of the wallet (Eternl)?"** — The backend builds the *unsigned* transaction; it never holds private keys. Eternl (or any CIP-30 wallet) is what actually signs the transaction in the browser, keeping custody of funds and keys with the user at all times.