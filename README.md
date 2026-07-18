# Blockchain Notes App

A full-stack notes app that uses Blockfrost as its Cardano blockchain provider and Supabase for persistent note proof storage. The backend keeps provider credentials private, queries the latest Cardano block, anchors each saved note to that block with a local SHA-256 note hash, and stores the resulting proof in Supabase.

Blockfrost is the chain access layer for this app. It does not sign wallet transactions by itself, so this starter records anchored note proofs locally. Publishing note metadata directly on-chain would require adding a Cardano wallet/signing flow and submitting a signed transaction through Blockfrost.

## Project Structure

```text
.
|-- backend
|   |-- blockchain.js
|   |-- package.json
|   |-- server.js
|   `-- src
|       |-- app.js
|       |-- config
|       |   |-- blockfrost-config.js
|       |   `-- env.js
|       |-- entities
|       |   `-- note-block.js
|       |-- routes
|       |   `-- api-routes.js
|       `-- services
|           |-- blockfrost-client.js
|           `-- notes-ledger.js
|-- frontend
|   |-- index.html
|   |-- package.json
|   |-- src
|   |   |-- api
|   |   |   `-- blockchainApi.ts
|   |   |-- App.tsx
|   |   |-- main.tsx
|   |   |-- styles.ts
|   |   |-- types
|   |   |   `-- blockchain.ts
|   |   |-- utils
|   |   |   `-- hash.ts
|   |   `-- vite-env.d.ts
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- .gitignore
`-- README.md
```

## Architecture

- `backend/src/entities` contains note-block creation and hash validation.
- `backend/src/services` contains application logic, external Blockfrost API access, and note storage adapters.
- `backend/src/routes` contains HTTP request handling.
- `backend/server.js` only loads configuration, creates the app, and starts the server.
- `frontend/src/api`, `types`, `utils`, and `styles` keep data access and shared support code out of the main React component.

## Prerequisites

- Node.js 18 or newer
- npm
- A Blockfrost project for Cardano mainnet, preprod, or preview
- A Supabase project

## Blockfrost Setup

1. Create a Blockfrost account and project.
2. Choose the Cardano network for the project.
3. Copy the generated `project_id`.
4. Create `backend/.env` from `backend/.env.example`.
5. Set the values:

```bash
BLOCKFROST_PROJECT_ID=preprod_your_project_id_here
BLOCKFROST_NETWORK=preprod
PORT=5000
```

Supported `BLOCKFROST_NETWORK` values are `mainnet`, `preprod`, and `preview`.

Keep `BLOCKFROST_PROJECT_ID` out of frontend code and commits.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run the schema in `backend/supabase/schema.sql`.
3. Copy your project URL and service role key from the Supabase dashboard.
4. Add the values to `backend/.env`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_backend_only_service_role_key
SUPABASE_NOTE_BLOCKS_TABLE=note_blocks
```

Keep `SUPABASE_SERVICE_ROLE_KEY` in the backend only. If Supabase variables are omitted, the app falls back to in-memory note storage for local development.

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

Available endpoints:

- `GET /api/chain` - fetch local anchored notes plus the latest Cardano block from Blockfrost
- `POST /api/notes` - add a note with JSON body `{ "author": "Ada", "content": "My secured note" }`
- `GET /api/health` - check API and provider configuration

## Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173`.

## Development Flow

1. Start the backend from `/backend`.
2. Start the frontend from `/frontend`.
3. Add notes from the dashboard.
4. Inspect each note hash, previous note hash, and the Cardano block returned by Blockfrost at the time the note was saved.

With Supabase configured, restarting the backend preserves note proofs. The Cardano block data is always fetched live through Blockfrost.
