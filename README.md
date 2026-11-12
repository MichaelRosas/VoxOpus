# VoxOpus

A microphone-only student task and event schedule. Record a request, review the proposal, then record “confirm changes”, “cancel changes”, or a correction. The transcript is read-only. There are no typed task-entry fields.

## Setup

Run from the repository root:

```bash
npm install
npm run build --workspace shared
```

Create `backend/.env` locally from `backend/.env.example` and set `OPENAI_API_KEY` to your own key. Do not commit it. You can optionally set `OPENAI_MODEL`; the existing default is `gpt-6-luna`.

Start the backend and frontend in separate terminals:

```bash
npm run dev --workspace backend
```

```bash
npm run dev --workspace frontend
```

Open the local URL printed by Vite and allow microphone access. The backend must keep running on port 3001. Vite proxies `/api` to it. After changing shared sources, rebuild shared or run `npm run dev --workspace shared` in a third terminal.