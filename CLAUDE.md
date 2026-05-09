# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (run from `frontend/`)

```bash
pnpm dev          # Start Vite dev server on port 5173
pnpm build        # Type-check + build for production
pnpm lint         # Run ESLint
pnpm preview      # Preview production build
```

### Backend (run from repo root)

```bash
# Start FastAPI server (port 8000)
uvicorn backend.api:app --reload

# Start LangGraph agent server (port 2024) — required for chat to work
langgraph dev
```

### Full Dev Setup

All three services must run simultaneously:

1. `langgraph dev` (port 2024) — agent runtime
2. `uvicorn backend.api:app --reload` (port 8000) — REST API for stats
3. `cd frontend && pnpm dev` (port 5173) — UI

Environment: place `.env` in the repo root with `GOOGLE_API_KEY=<your-key>`.

## Architecture

### What It Does

"Personal OS" is a conversational AI assistant (Jarvis) for tracking three life domains via natural language: **finances**, **movies**, and **journal entries**.

### Service Layout

```
personal-os/
├── frontend/          # React 19 + TypeScript + Vite
├── backend/
│   ├── api.py         # FastAPI REST server (stats endpoints)
│   ├── main.py        # Placeholder / DB init
│   └── *.py           # SQLAlchemy models, LangGraph agent graph
└── .env               # GOOGLE_API_KEY
```

### Data Flow

1. User sends a message → `App.tsx` submits it via LangGraph SDK (`stream.submit`)
2. LangGraph agent (port 2024) processes it: extracts intent, writes to SQLite
3. Agent emits **interrupts** when it needs user confirmation (structured data extracted)
4. Frontend polls `/threads/{threadId}/state` to detect interrupt state
5. User approves/rejects via confirmation card → `handleDecision()` resumes agent
6. Dashboard stats are fetched from FastAPI (port 8000): `/api/finance`, `/api/movies`, `/api/journal`

### Frontend Architecture (`frontend/src/`)

- **`App.tsx`** — single orchestrator: chat UI, modal state, interrupt polling, stats refresh
- **`FinanceTab` / `MoviesTab` / `JournalTab`** — dashboard views rendered inside modals
- **`MovieLogCard` / `JournalEntryCard`** — generative UI components streamed from agent
- **`StatTile` / `Modal`** — reusable primitives
- State is managed with plain React hooks (`useState`, `useRef`, `useEffect`); no external state library
- LangGraph SDK manages conversation thread persistence across messages

### Backend Architecture (`backend/`)

- **`api.py`** — FastAPI app with CORS for `localhost:5173`; read-only stats endpoints
- **SQLite** (`personal_os.db`) with three tables: `transactions`, `movie_logs`, `journal_entries`
- **LangGraph agent** handles all writes; FastAPI only reads
- Agent uses Google Generative AI (via `langchain-google-genai`) as the LLM

### Key Patterns

- **Human-in-the-loop**: Agent pauses execution and emits an interrupt; frontend must resume it with an approval dict before the agent continues
- **Generative UI**: Agent can stream custom React component data (MovieLogCard, JournalEntryCard) inline in the chat via LangGraph custom events
- **Multi-intent**: The graph uses LangGraph`s`Send` API to execute parallel nodes when a message contains multiple intents
