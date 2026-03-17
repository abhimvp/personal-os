# frontend working notes

- setting up frontend with [react-vite-ts](https://vite.dev/guide/#scaffolding-your-first-vite-project)
  - `pnpm create vite frontend --template react-ts`

```bash
(backend)
abhis@Tinku MINGW64 ~/Desktop/personal-os (main)
$ pnpm create vite frontend --template react-ts
.../19ce235c5f4-7cb4                     |   +1 +
.../19ce235c5f4-7cb4                     | Progress: resolved 1, reused 0, downloaded 1, added 1, done
│
◇  Use Vite 8 beta (Experimental)?:
│  No
│
◇  Install with pnpm and start now?
│  Yes
│
◇  Scaffolding project in C:\Users\abhis\Desktop\personal-os\frontend...
│
◇  Installing dependencies with pnpm...

```

- creates the `frontend` app for us & launches the server right away.
- now we add the `langchain/langgraph-sdk` to interacting with the LangGraph REST API. [Refer docs](https://www.npmjs.com/package/@langchain/langgraph-sdk)
- @langchain/langgraph-sdk doc in [langchain](https://reference.langchain.com/javascript/langchain-langgraph-sdk)
- What @langchain/langgraph-sdk gives you:
  - `useStream()` hook - [reference](https://reference.langchain.com/javascript/langchain-langgraph-sdk/react/useStream)
  - `LoadExternalComponent` for Generative UI - [reference](https://reference.langchain.com/javascript/langchain-langgraph-sdk/react-ui/LoadExternalComponent)
  - TypeScript types for messages, interrupts, state

```bash
(backend)
abhis@Tinku MINGW64 ~/Desktop/personal-os/frontend (main)
$ pnpm add @langchain/langgraph-sdk
Packages: +7
+++++++
Progress: resolved 234, reused 180, downloaded 5, added 7, done

dependencies:
+ @langchain/langgraph-sdk 1.7.2

╭ Warning ───────────────────────────────────────────────────────────────────────────────────╮
│                                                                                            │
│   Ignored build scripts: esbuild@0.27.3.                                                   │
│   Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.   │
│                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────╯
Done in 3.4s using pnpm v10.26.1
```

- Add this peer dependency for langgraph-sdk - `pnpm add @langchain/core`
- Also clean up the default code of react-vite-ts as we don't need it all & let's the test the connection.
- the frontend is able to test the connection with backend langgraph server. Looks cool.

- **Learning Notes**: Understanding `useStream` - [Refer this doc if needed](./learning_notes/useStream.md).

- Update `frontend/src/App.tsx` to match the new state shape — specifically add the `ui` field so TypeScript knows about it.
- `The graph always enters at the router node first. The router sets an intent field on state, then a conditional edge reads that intent and branches to the appropriate node - finance, movie, journal, or a fallback chat node. Each node returns updates that get merged back into state using reducers. The add_messages reducer appends rather than overwrites, which is how conversation history is preserved across turns.`
