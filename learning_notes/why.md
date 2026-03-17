# Why

## Why Not `MessagesState`?

`MessagesState` is a convenience shortcut that gives you this:

```python
class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
```

That's it. Just one field. It's perfect for a simple chatbot.

But our `AgentState` needs **more than just messages**:

```python
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    ui: Annotated[Sequence[AnyUIMessage], ui_message_reducer]
    intent: str
```

We have `ui` for Generative UI components, and `intent` for routing. `MessagesState` has no room for these. The moment you need custom fields, you define your own `TypedDict` — and `MessagesState` becomes irrelevant.

You *could* subclass it:

```python
class AgentState(MessagesState):
    ui: Annotated[Sequence[AnyUIMessage], ui_message_reducer]
    intent: str
```

That works fine too. We just wrote it explicitly so you can *see exactly what's in state* — which is better for learning.

---

## Why `Sequence` Instead of `list`?

Both work. The difference is intent:

```python
messages: Annotated[Sequence[BaseMessage], add_messages]
# vs
messages: Annotated[list[BaseMessage], add_messages]
```

`Sequence` is a broader read-only type that includes lists, tuples, and anything else that's ordered and iterable. Using it on state says *"I'm reading from this, not mutating it in place"* — which is exactly right for LangGraph state. Nodes should never mutate state directly, they return updates.

In practice for our project it makes no real difference. You'll see both in LangGraph codebases. We used `Sequence` because that's what the official LangGraph source uses for `AgentState` patterns — so if you read LangGraph internals or examples it'll feel familiar.

---

## Why `Annotated`?

This is the key one. `Annotated` is how Python attaches a **reducer function** to a state field.

```python
messages: Annotated[Sequence[BaseMessage], add_messages]
#         └── type ──────────────────────┘  └── reducer ┘
```

Without `Annotated`, every node that writes to `messages` would **overwrite** the whole list. That means if node A writes `[msg1]` and node B writes `[msg2]`, you'd only end up with `[msg2]` — the previous message gone.

With `Annotated[..., add_messages]`, LangGraph knows to **merge** the updates instead. `add_messages` is smart — it appends new messages but also handles updates to existing messages by ID, so you never get duplicates.

Same idea for `ui`:

```python
ui: Annotated[Sequence[AnyUIMessage], ui_message_reducer]
```

`ui_message_reducer` knows how to append new UI components and handle updates/removals to existing ones. Without it, every node that pushes a UI card would wipe out the previous ones.

And `intent` has no `Annotated` — it's a plain string. So it just **overwrites** each time, which is exactly what we want. The router sets it once per turn and we don't need history.

---

## The Mental Model

```
Field with Annotated reducer  →  MERGE  (accumulate over time)
Field without Annotated       →  OVERWRITE  (last write wins)
```

| Field | Reducer | Behavior |
|---|---|---|
| `messages` | `add_messages` | Appends new messages, smart deduplication |
| `ui` | `ui_message_reducer` | Appends new UI cards, handles updates/deletes |
| `intent` | none | Overwrites every time |

---

Want this as a `.md` reference file too, or shall we push straight into **Step 3 — the Intent Router**?
