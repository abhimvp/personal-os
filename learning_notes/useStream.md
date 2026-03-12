# Understanding `useStream` — Personal OS Learning Notes

---

## The Connection

```tsx
const stream = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "personal_os",
});
```

This establishes a **live connection** to the LangGraph server. Nothing runs yet.  
Think of it like opening a phone line — no call has been made, but the line is ready.

`stream` is an **object** that holds everything:

- The current messages
- Loading state
- Error state
- Functions to interact with the graph

---

## What Lives on the `stream` Object

Every key below is directly accessible as `stream.X` in your component:

| Property           | Type                     | What it is                           |
| ------------------ | ------------------------ | ------------------------------------ |
| `stream.messages`  | `Message[]`              | All messages in the current thread   |
| `stream.isLoading` | `boolean`                | Is the graph currently running?      |
| `stream.error`     | `Error \| null`          | Did something break?                 |
| `stream.interrupt` | `Interrupt \| undefined` | Is the graph paused, waiting for me? |
| `stream.submit()`  | `function`               | Send a message / resume the graph    |
| `stream.stop()`    | `function`               | Cancel the current run               |
| `stream.values`    | `StateType`              | The full current graph state         |

---

## `stream.submit()` — Firing the Graph

```tsx
stream.submit({
  messages: [{ type: "human", content: "hello" }],
});
```

When called, three things happen:

1. A new **thread** is created on the LangGraph server (a thread = a conversation session with its own ID)
2. The input is sent as the initial state to the graph
3. A **streaming connection (SSE)** opens to receive updates back in real time

> **Important:** The input shape must match your graph's state shape in Python.
>
> Python state:
>
> ```python
> class AgentState(TypedDict):
>     messages: Annotated[Sequence[BaseMessage], add_messages]
> ```
>
> Frontend input:
>
> ```tsx
> {
>   messages: [{ type: "human", content: "hello" }];
> }
> ```
>
> The key `messages` matches on both sides. This is the contract between frontend and backend.

---

## `stream.isLoading` — Reactive State

```tsx
{
  stream.isLoading && <p>Loading...</p>;
}
```

- `true` from the moment `submit()` is called until the graph finishes and the stream closes
- React re-renders automatically when this changes
- You never manage this manually — `useStream` handles it internally with `useState`

---

## `stream.messages` — Live Message Array

```tsx
{
  stream.messages.map((m, i) => (
    <p key={i}>
      {m.type}: {m.content as string}
    </p>
  ));
}
```

This array **grows in real time** as the graph streams responses.

Each message has:

- `m.type` → `"human"` | `"ai"` | `"tool"`
- `m.content` → the text content
- `m.id` → unique ID

When the LLM is wired up, the AI response streams in token by token and this array updates live — no extra setup needed.

---

## The Mental Model

```
useStream() call
      │
      ▼
  stream object
  ├── stream.messages    ← READ: what's been said
  ├── stream.isLoading   ← READ: is graph running?
  ├── stream.error       ← READ: did something break?
  ├── stream.interrupt   ← READ: is graph paused waiting for me?
  ├── stream.values      ← READ: full graph state
  ├── stream.submit()    ← WRITE: send a message / resume graph
  └── stream.stop()      ← WRITE: cancel current run
```

**Reading** from `stream` → rendering UI  
**Writing** to `stream` → user actions

---

## How Each Feature Maps to the Stream Object

| Feature                       | What to use                                           |
| ----------------------------- | ----------------------------------------------------- |
| Show AI response              | `stream.messages`                                     |
| Show a spinner                | `stream.isLoading`                                    |
| Show an error                 | `stream.error`                                        |
| Send a message                | `stream.submit({ messages: [...] })`                  |
| Show confirmation card (HITL) | `stream.interrupt`                                    |
| Approve an interrupt          | `stream.submit(null, { command: { resume: value } })` |
| Cancel a run                  | `stream.stop()`                                       |

---

## What Happens End-to-End When You Click "Send"

```
Button clicked
      │
      ▼
stream.submit({ messages: [{ type: "human", content: "hello" }] })
      │
      ▼
LangGraph server creates a Thread
      │
      ▼
Graph runs — nodes execute
      │
      ▼
SSE stream sends events back to the frontend
      │
      ▼
stream.messages updates live → React re-renders
stream.isLoading becomes false when done
```

---

## Resuming an Interrupt (Human-in-the-Loop Preview)

When the graph hits an `interrupt()` checkpoint:

- `stream.isLoading` stays `true` (graph is paused, not done)
- `stream.interrupt` becomes defined with the interrupt value
- You render a confirmation UI based on `stream.interrupt.value`
- User clicks Approve → you call `stream.submit(null, { command: { resume: approvedValue } })`
- Graph resumes from where it paused

This is the core pattern for human-in-the-loop — covered in detail in Step 5.
