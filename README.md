# Blockchain Notes App

A full-stack notes app that publishes privacy-preserving note proofs to Cardano Preprod. Notes stay in Supabase; only a SHA-256 proof and action name are placed in transaction metadata. Eternl or another CIP-30 wallet signs each transaction, and Blockfrost submits and verifies it.

Transaction history keeps the local `proofHash` separate from the real `cardanoTxHash` and reports `Pending`, `Confirmed`, or `Failed`, along with the confirmed block hash, block height, network, and a Preprod explorer link.

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

- `backend/src/domain` contains note-block creation and hash validation without framework dependencies.
- `backend/src/application` coordinates note use cases through injected provider, persistence, and logging dependencies.
- `backend/src/services` contains the Cardano transaction builder, Blockfrost SDK adapter, persistence adapters, and transaction logger.
- `backend/src/http` contains Express controllers, routes, payload parsing, and centralized error middleware.
- `backend/src/app.js` is the composition root; `backend/server.js` only loads configuration and starts HTTP listening.
- `frontend/src/features/notes` owns note components, API calls, feature types, pages, and state orchestration.
- `frontend/src/App.tsx` selects the feature page, while `frontend/src/config` owns deployment-specific configuration.

## Prerequisites

- Node.js 18 or newer
- npm
- A Cardano Preprod Blockfrost project
- A Supabase project
- Eternl or another CIP-30 browser wallet configured for Preprod
- Preprod test ADA from a Cardano testnet faucet

## Blockfrost Setup

1. Create a Blockfrost account and project.
2. Choose Cardano Preprod for the project.
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

- `GET /api/chain` - fetch local anchored notes plus the latest Cardano block from Blockfrost
- `GET /api/notes/trash` - fetch soft-deleted notes
- `GET /api/activity` - fetch recent note activity tracked by connected wallet address
- `POST /api/transactions/prepare` - build an unsigned Preprod metadata transaction from CIP-30 wallet UTXOs
- `POST /api/transactions/submit` - assemble wallet witnesses and submit the signed transaction through Blockfrost
- `POST /api/notes` - add a note with JSON body `{ "author": "Ada", "content": "My secured note" }`
- `PUT /api/notes/:id` - edit a note with JSON body `{ "author": "Ada", "content": "Updated note" }`
- `DELETE /api/notes/:id` - soft delete a note by moving it to Trash and recalculating the local proof chain
- `POST /api/notes/:id/restore` - restore a soft-deleted note
- `DELETE /api/notes/:id/permanent` - permanently delete a note from storage
- `GET /api/health` - check API and provider configuration

## Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`.

## Eternl Preprod Setup

1. Switch Eternl to the Preprod testnet and select a dApp account.
2. Fund that account with test ADA from a Cardano Preprod faucet.
3. Open the app and connect Eternl.
4. Create, edit, delete, or restore a note and approve the transaction prompt.
5. Open Transaction history to follow it from `Pending` to `Confirmed` and use the explorer link.

The transaction spends only the network fee from test ADA and sends the remaining value back to the wallet. The note title and content are never included in Cardano metadata.

## Development Flow

1. Start the backend from `/backend`.
2. Start the frontend from `/frontend`.
3. Connect a funded Preprod wallet.
4. Add or change a note and approve the wallet transaction.
5. Inspect the proof hash, Cardano transaction ID, status, and confirmed block in Transaction history.

With Supabase configured, restarting the backend preserves note activity and confirmation state. Pending entries are checked against Blockfrost whenever activity loads; confirmed entries receive their Cardano block hash and height, while expired unconfirmed transactions become `Failed`.
