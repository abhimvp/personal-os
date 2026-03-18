# Personal OS — Project Context File
>
> Feed this to Claude Code, Cowork, or any new AI session to resume context instantly.
> Last updated: March 2026

---

## What This Project Is

A "Personal OS" — a Jarvis-style life tracker that lets you log movies, expenses, journal entries, and trips through **natural language conversation**. No forms. No navigation. Just talk to it.

Built as a portfolio project to demonstrate real-world LangGraph/LangChain architecture — not a chatbot wrapper, but a full agentic system with routing, memory, human oversight, and Generative UI.

**The core idea:** One sentence can trigger multiple agents in parallel. *"Watched Interstellar halfway through and spent ₹800 on dinner"* → movie node + finance node run simultaneously, each pushes a UI card, each asks for confirmation before writing to DB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent Framework | LangGraph (StateGraph, interrupt, Send API) |
| LLM | Google Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`) via `langchain-google-genai` |
| Backend | Python + FastAPI |
| Package Manager (Python) | `uv` |
| Frontend | React + TypeScript + Vite |
| Package Manager (JS) | `pnpm` |
| Streaming UI | `@langchain/langgraph-sdk` — `useStream()` hook |
| Database | SQLite (dev) via SQLAlchemy |
| OS | Windows |

---

## Project Structure

```
personal-os/
├── backend/
│   ├── agent/
│   │   ├── graph.py           # Main StateGraph — all nodes wired here
│   │   ├── state.py           # AgentState TypedDict (messages, ui, intent)
│   │   ├── llm.py             # Lazy-loaded Gemini via lru_cache → get_llm()
│   │   └── nodes/
│   │       ├── router.py      # Intent classifier — returns list of intents
│   │       ├── finance.py     # Expense/income extraction + DB write
│   │       ├── movie.py       # Movie log extraction + Generative UI + DB write
│   │       └── journal.py     # Journal entry extraction + instant DB write
│   ├── models/
│   │   └── database.py        # SQLAlchemy models: Transaction, MovieLog, JournalEntry
│   ├── api.py                 # FastAPI server — /api/finance, /api/movies, /api/journal
│   ├── langgraph.json         # LangGraph server config
│   └── .env                   # GOOGLE_API_KEY=...
├── frontend/
│   └── src/
│       ├── App.tsx            # Main app — chat + stat tiles + modals
│       └── components/
│           ├── ui/
│           │   ├── MovieLogCard.tsx
│           │   └── JournalEntryCard.tsx
│           └── dashboard/
│               ├── FinanceTab.tsx
│               ├── MoviesTab.tsx
│               └── JournalTab.tsx
├── README.md
└── CONTEXT.md                 # ← this file
```

---

## How to Run (3 Terminals)

```powershell
# Terminal 1 — LangGraph agent server (port 2024)
cd backend
.venv\Scripts\activate
langgraph dev

# Terminal 2 — FastAPI data server (port 8000)
cd backend
.venv\Scripts\activate
uvicorn api:app --port 8000 --reload

# Terminal 3 — React frontend (port 5173)
cd frontend
pnpm dev
```

---

## Architecture — How the Graph Works

```
User Message
     │
     ▼
router_node  ← Gemini structured output → IntentClassification { intents: ["movie", "finance"] }
     │
fan_out_by_intent()  ← returns list of Send() objects for parallel execution
     │
┌────┴────┐
▼         ▼
movie    finance   ← run in parallel (same superstep)
node     node
  │         │
  └────┬────┘
       ▼
  Both interrupt() — graph pauses
  Frontend polls /threads/{id}/state for interrupt IDs
  User approves/rejects each
  Resume with dict: { id1: {approved: true}, id2: {approved: false} }
       ▼
  Both nodes complete, DB writes happen
```

**Key LangGraph concepts used:**

- `StateGraph` with `TypedDict` state
- `Annotated` reducers (`add_messages`, `ui_message_reducer`)
- `with_structured_output(method="json_schema")` for Gemini
- `interrupt()` for human-in-the-loop
- `Send API` for parallel fan-out (multi-intent)
- `push_ui_message()` for Generative UI
- `useStream()` React hook with `onCustomEvent` for UI cards

---

## State Definition

```python
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]  # conversation history
    ui: Annotated[Sequence[AnyUIMessage], ui_message_reducer]  # generative UI cards
    intent: str  # comma-separated intents e.g. "movie,finance"
```

---

## Key Implementation Decisions & Why

**Why no interrupt for journal?**
Journal entries are low-stakes. Confirmation adds friction with zero benefit. Intentional decision — shows understanding of when NOT to use HITL.

**Why `method="json_schema"` not `function_calling`?**
Gemini is more reliable with native JSON schema mode. `function_calling` was producing occasional failures.

**Why `lru_cache` on `get_llm()`?**
`ChatGoogleGenerativeAI` validates the API key at instantiation time. If instantiated at module import, it fails before `.env` is loaded. Lazy loading with `lru_cache` fixes this — created on first call, cached after.

**Why poll `/threads/{id}/state` instead of using `stream.interrupt`?**
In LangGraph dev mode, when a run hits `interrupt()`, it's marked as "succeeded" not "interrupted" — `stream.interrupt` doesn't populate reliably. Polling thread state directly is the workaround.

**Why resume with a dict `{id: value}` not an array?**
LangGraph requires `Command(resume={"interrupt_id_1": value, "interrupt_id_2": value})` format for multiple parallel interrupts. Arrays fail with RuntimeError.

---

## Database Models

```python
class Transaction(Base):
    id, amount, currency, category, description, type, created_at

class MovieLog(Base):
    id, title, status, progress, mood_tags (JSON), context_tags (JSON), notes, created_at

class JournalEntry(Base):
    id, content, mood, tags (JSON), reminder_days, created_at
```

---

## Frontend Architecture

- **Stat tiles** — Finance (total spent), Movies (count), Journal (count) — clickable, open modals
- **Modal overlays** — FinanceTab / MoviesTab / JournalTab render inside modals
- **Chat interface** — centered, bubble-style messages, human right / AI left
- **Generative UI** — `onCustomEvent` captures `push_ui_message` events, renders via `UI_COMPONENTS` map
- **Interrupt handling** — polls thread state, collects interrupt IDs, `handleDecision()` accumulates per-interrupt decisions, submits all at once via direct fetch

---

## What's Built (Completed Steps)

- ✅ Step 1 — Project setup, LangGraph server, React connected
- ✅ Step 2 — StateGraph with Gemini wired up, chat_node streaming
- ✅ Step 3 — Intent router with structured output (Pydantic + Literal types)
- ✅ Step 4 — Finance node: extraction + interrupt + DB write
- ✅ Step 5 — Movie node: extraction + Generative UI card + interrupt + DB write
- ✅ Step 6 — Journal node: extraction + instant save + Generative UI card
- ✅ Step 7 — Multi-intent: Send API fan-out, parallel execution, multi-interrupt resume
- ✅ Dashboard — Tabbed stat tiles with modal data views (Finance/Movies/Journal)
- ✅ UI redesign — Dark gradient theme, DM Sans font, centered chat, bubble messages

---

## What's Next (Backlog)

- ⬜ Step 8 — Chroma memory layer (agent learns patterns over time)
- ⬜ Step 9 — Audit trail UI (every agent decision as a timeline)
- ⬜ Step 10 — Polish + UX improvements
- ⬜ LangSmith tracing (2 env vars — do this first)
- ⬜ Soft delete / undo last action
- ⬜ Retry policy with max_attempts on nodes
- ⬜ Trip log module (sub-graph for multi-stop travel logging)

---

## Production Scaling — What Would Change

When scaling to multi-user:

1. **Auth first** — JWT tokens, `user_id` via LangGraph `configurable` config
2. **PostgreSQL** — swap SQLite, add `user_id` to every table with indexes
3. **LangGraph Postgres checkpointer** — persistent threads across restarts
4. **FastAPI auth middleware** — `Depends(get_current_user)` on every endpoint
5. **Rate limiting** — `slowapi` for API, retry policy limits for LangGraph nodes
6. **Soft delete** — `deleted_at` column, undo last action via router
7. **Feature flags** — env var kill switches per node, no redeployment needed
8. **LangSmith** — full observability, traces every LLM call automatically

---

## Known Issues / Quirks

- Gemini 3.x returns content as a list of blocks, not a plain string. Frontend uses `extractText()` to handle both formats.
- `reconnectOnMount: true` on `useStream` causes auto-resume of interrupts — removed intentionally.
- Multi-interrupt resume must use `{ id: value }` dict format, not array. Direct fetch to `/threads/{id}/runs/stream` bypasses SDK limitation.
- `langgraph dev` file watcher on Windows sometimes misses changes — restart manually after Python edits.
- Only 20-500 RPD on Gemini free tier depending on model. Be conservative with test runs.

---

## Interview Talking Points

**"Walk me through your graph architecture"**
The graph always enters at the router node. Router uses LangChain structured output with Pydantic + Literal types to classify intent into a typed list. `fan_out_by_intent()` reads that list and returns either a single node name or multiple `Send()` objects for parallel execution. Each branch runs independently in the same superstep. `add_messages` reducer merges results back into state.

**"Have you implemented human-in-the-loop?"**
Yes — before any write operation, the node hits `interrupt()` which pauses the graph and serializes state. The frontend polls the thread state endpoint to get interrupt IDs, renders a confirmation card, and when the user decides, resumes with `command: { resume: { id: value } }`. For multiple parallel interrupts, all decisions are collected before a single resume call.

**"What's the hardest thing you solved?"**
Multi-intent routing with parallel interrupts. One message fans out to two nodes via Send API, both hit `interrupt()` simultaneously, each gets its own interrupt ID. LangGraph requires resuming all of them in a single call with a dict of `{id: value}` pairs. The SDK's `stream.submit` doesn't handle this correctly — had to bypass it with a direct fetch to the runs endpoint.

**"What's Generative UI?"**
Instead of the agent returning text, it calls `push_ui_message()` with a component name and typed props. The frontend's `onCustomEvent` handler captures this and renders the matching React component inline in the chat. The agent decides what UI to show based on what it understood — not hardcoded by the frontend.
