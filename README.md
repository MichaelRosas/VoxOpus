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

## Speaking to VoxOpus

- “Add a chemistry quiz every Thursday from 5 pm to 6 pm, starting October 29. Description: chapters 3 and 4.”
- “Move the chemistry quiz to Friday at the same time.”
- “Remove only the reminder from my quiz.”
- “Complete the chemistry quiz.”
- “Delete the chemistry quiz.”
- “Confirm changes”, “cancel changes”, or “dismiss reminders”.

Interpretation starts automatically when recording ends. Press the microphone again to stop if needed. Another recording can answer a clarification question or revise the pending request without erasing the original intent. Say “cancel changes” before starting an unrelated request.

Time ranges, descriptions, deadlines, reminders and daily/weekly recurrence are supported. Recurrence preserves local time using a saved IANA zone. Completing a recurring occurrence advances to the next; deleting the series removes it. Monthly/custom recurrence and single-occurrence exceptions are not supported and prompt clarification. Reminders require the tab to stay open. Tasks are stored in this browser.

## Troubleshooting

- **Speech connection error:** this comes from the browser speech provider, not OpenAI. Try Safari if Chrome's speech service is unreachable, check a different network, and check any VPN/proxy. Already-installed local English recognition is preferred when supported; the app does not silently install a language pack.
- **Interpretation service unavailable:** keep the backend running and check `http://localhost:3001/api/health`. Set the API key in `backend/.env`, then restart the backend. Your pending request stays visible; record “try again”.
- **Ambiguous date or task:** record an answer to the question. Nothing changes until you confirm.

## Checks

```bash
npm run build --workspace shared
npm run test --workspace frontend
npm run test --workspace backend
npm run lint --workspace frontend
npm run build --workspace frontend
npm run build --workspace backend
```

An opt-in live test uses synthetic requests and incurs API charges:

```bash
cd backend
node --env-file=.env --import tsx tests/commands.live.ts
```

See [the Part 2 audit](docs/UI-AUDIT-PART2.md) for source locations, design checks, testing, and limitations.
