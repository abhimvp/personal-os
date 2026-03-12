# 🧠 Personal OS - A Jarvis-Style Life Tracker

> A "Personal OS" built with LangGraph, LangChain, and React that lets you manage your entire life - finances, movies, journaling, and travel - through natural language. No forms. No dashboards. Just talk to it.

---

## 💡 The Idea

Most productivity apps fail because they require too much manual effort - opening a screen, finding the right section, filling out a form. This project eliminates all of that.

**You type (or say) one sentence. The AI handles the rest.**

> _"I watched Interstellar halfway through last night and spent ₹800 on dinner"_

The agent detects two actions, logs both, pushes rich UI cards inline in the chat for confirmation, and only commits the data after you approve. No forms. No navigation. Just a conversation.

This is built on **LangGraph's Generative UI** pattern - the agent doesn't just reply with text, it renders real React components directly inside the chat based on what it understood.

- [Track My Life](https://abhimvp.dev/) - go to innovation section of the page.

---

## 🏗️ Architecture Overview

```
User Message (Natural Language)
        │
        ▼
┌─────────────────────┐
│   Intent Router     │  ← LangGraph Node: classifies intent(s)
│   (LangChain LLM)   │    detects if 1 or multiple actions needed
└────────┬────────────┘
         │
   ┌─────┴──────┬──────────────┬──────────────┐
   ▼            ▼              ▼              ▼
Finance      Movie          Journal        Trip Log
 Node         Node           Node           Node
   │            │              │              │
   └─────┬──────┴──────────────┴──────────────┘
         │
         ▼
┌─────────────────────┐
│  Human-in-the-Loop  │  ← LangGraph interrupt()
│  Confirmation Node  │    Pushes ConfirmCard to React UI
└────────┬────────────┘
         │ User approves / rejects
         ▼
┌─────────────────────┐
│   Write to DB       │  ← Commits data, logs to Audit Trail
│   + Audit Logger    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Memory Update      │  ← Updates Chroma vector store
│  (Chroma Vector DB) │    Agent learns your patterns over time
└─────────────────────┘
```

---

## ✨ Core Features

### 🤖 Central AI Agent (The "Jarvis" Layer)

The heart of the project. A LangGraph `StateGraph` that accepts natural language, routes to the right module, and manages the full lifecycle of every action.

- **Intent Routing** - classifies what the user wants and which module(s) to involve
- **Multi-Intent Detection** - one message can trigger multiple nodes in parallel (e.g., log a movie _and_ an expense simultaneously)
- **Structured Output** - uses LangChain tool binding to extract clean, typed data from messy natural language
- **Human-in-the-Loop** - graph pauses before any write, renders a confirmation card in the UI, and resumes only after user approval
- **Context Awareness** - reads from Chroma vector store to understand your patterns (_"you usually mark drama films as Emotional Climax"_)

### 💬 Generative UI (LangGraph + React)

The agent renders rich React components directly in the chat. No static dashboard — the UI is _generated_ based on what the agent understood.

| Agent Action                     | UI Component Rendered                                    |
| -------------------------------- | -------------------------------------------------------- |
| Parsed a movie entry             | `MovieLogCard` - title, progress bar, mood tags          |
| Parsed an expense                | `ExpenseCard` - amount, category, account                |
| Parsed a journal entry           | `JournalEntryCard` - text, timestamp, mood               |
| Needs confirmation before saving | `ConfirmActionCard` - summary + Approve / Reject buttons |
| Multiple actions detected        | `BatchActionCard` - all pending actions listed           |
| Trip summary requested           | `TripSummaryCard` - stops, bills, total cost             |

### 📓 Mind & Media Module

Track what you watch and what you think.

- **Movie / Show Tracking** - log title, progress (multi-session), mood tags (`"Emotional Climax"`, `"Inspirational"`), and context tags (`"Watch on Sunday Morning"`)
- **One-Liner Journaling** - quick thoughts and memories. Agent adds a smart reminder to revisit them later
- **Natural language queries** - _"What have I been journaling about lately?"_ or _"Show me all movies I marked as Inspirational"_

### 💰 Wallet & Wanderlust Module

Track money across currencies, accounts, and trips.

- **Smart Finance** - multi-currency expense and income tracker across different accounts
- **Trip Logs** - a "sub-Splitwise" feature. Log every stop, bill, and note during travel. At any point, ask the agent to auto-summarize the entire trip cost
- **Calendar Integration** - sync scheduled payments and view a timeline of your financial activity

### 🧾 Audit Trail

Every agent decision is logged - what it understood, what it planned to do, whether the user approved or rejected, and what was finally committed. Fully visible in the React UI as an expandable decision log.

---

## 🛠️ Tech Stack

| Layer           | Technology                                             |
| --------------- | ------------------------------------------------------ |
| Agent Framework | LangGraph (StateGraph, interrupt, subgraphs)           |
| LLM / Tools     | LangChain (tool binding, structured output, LCEL)      |
| Memory          | Chroma (vector store for context awareness)            |
| Backend         | Python + FastAPI                                       |
| Frontend        | React + TypeScript                                     |
| Streaming UI    | LangGraph `useStream()` hook + `LoadExternalComponent` |
| Database        | SQLite (dev) / PostgreSQL (prod)                       |
| LLM Provider    | OpenAI GPT-4o / Anthropic Claude / Gemini              |

---

## 🧩 LangGraph Concepts Used

This project is intentionally designed to demonstrate the full range of LangGraph capabilities:

- **`StateGraph`** - core graph with typed state passed between nodes
- **Conditional Edges** - router branches to different nodes based on intent classification
- **Parallel Node Execution** - multi-intent messages fan out to multiple nodes simultaneously
- **`interrupt()`** - human-in-the-loop pause before write operations
- **Subgraphs** - trip log module uses a nested subgraph for multi-stop logging
- **Persistence / Checkpointing** - graph state is saved so sessions can be resumed
- **Generative UI** - `push_ui_message()` sends typed React components from the graph to the frontend
- **Memory** - Chroma vector store integrated into state for context-aware decisions

---

## 📁 Project Structure (Planned)

```
personal-os/
├── backend/
│   ├── agent/
│   │   ├── graph.py           # Main StateGraph definition
│   │   ├── router.py          # Intent classification node
│   │   ├── nodes/
│   │   │   ├── finance.py     # Finance tool node
│   │   │   ├── movie.py       # Movie tracker node
│   │   │   ├── journal.py     # Journal node
│   │   │   └── trip.py        # Trip log subgraph
│   │   ├── memory.py          # Chroma vector store integration
│   │   └── audit.py           # Audit trail logger
│   ├── tools/                 # LangChain custom tools
│   ├── models/                # DB models
│   └── main.py                # FastAPI server
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # Generative UI components
│   │   │   │   ├── MovieLogCard.tsx
│   │   │   │   ├── ExpenseCard.tsx
│   │   │   │   ├── JournalEntryCard.tsx
│   │   │   │   ├── ConfirmActionCard.tsx
│   │   │   │   ├── BatchActionCard.tsx
│   │   │   │   └── TripSummaryCard.tsx
│   │   │   ├── ChatThread.tsx
│   │   │   └── AuditLog.tsx
│   │   ├── hooks/
│   │   │   └── usePersonalOS.ts
│   │   └── App.tsx
│   └── langgraph.json         # UI component registry
│
├── langgraph.json             # LangGraph server config
├── README.md
└── .env.example
```

---

## 🗺️ Build Roadmap

### Phase 1 - Foundation ✅ (Start here)

- [ ] Project setup: LangGraph server + React app
- [ ] StateGraph skeleton with stub nodes
- [ ] Intent router (classifies: finance / movie / journal / unknown)
- [ ] First working node: Finance (structured output → DB write)

### Phase 2 - Core Loop

- [ ] Human-in-the-loop confirmation before writes
- [ ] Generative UI: first component pushed from graph to React
- [ ] Movie tracker node + MovieLogCard component
- [ ] Journal node + JournalEntryCard component

### Phase 3 - Advanced Features

- [ ] Multi-intent detection (one message → multiple nodes)
- [ ] BatchActionCard for multi-action confirmation
- [ ] Chroma memory integration (context awareness)
- [ ] Audit Trail UI

### Phase 4 - Polish

- [ ] Trip Log subgraph + TripSummaryCard
- [ ] Natural language query mode (_"How much did I spend last month?"_)
- [ ] Calendar sync for scheduled payments
- [ ] Streaming component props (cards appear and fill in real-time)

---

## 🎯 Why This Project Exists

Built as a portfolio project to demonstrate real-world usage of LangGraph's advanced patterns - not just a chatbot, but a full agentic system with routing, memory, human oversight, and generative UI.

Every feature is designed to answer a specific interview question:

- _"How did you handle multi-step agent workflows?"_ → StateGraph + conditional edges
- _"Have you implemented human-in-the-loop?"_ → interrupt() + ConfirmActionCard
- _"How did the frontend stay in sync with the agent?"_ → useStream() + Generative UI
- _"How did the agent personalize over time?"_ → Chroma vector store memory

---

_Building in silence. Demo when core systems are ready._
