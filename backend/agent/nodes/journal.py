from pydantic import BaseModel, Field
from typing import Optional
from langchain_core.messages import AIMessage
from langgraph.graph.ui import push_ui_message

from agent.state import AgentState
from agent.llm import get_llm
from models.database import get_session, JournalEntry, init_db


# ── Schema ────────────────────────────────────────────────────────────────────


class ExtractedJournalEntry(BaseModel):
    content: str = Field(
        description="The cleaned journal entry text. Keep it as the user said it."
    )
    mood: Optional[str] = Field(
        default=None,
        description=(
            "The mood of the entry. One of: "
            "happy, sad, reflective, anxious, excited, grateful, neutral. "
            "Infer from tone, null if unclear."
        ),
    )
    tags: list[str] = Field(
        default_factory=list,
        description=(
            "1-3 topic tags. E.g. 'work', 'personal', 'travel', 'health', 'family'. "
            "Only add if clearly relevant."
        ),
    )
    reminder_days: int = Field(
        default=7,
        description=(
            "How many days until the user should be reminded to revisit this. "
            "Default 7. Use 1 for urgent things, 30 for long-term reflections."
        ),
    )


JOURNAL_SYSTEM_PROMPT = """You are a journal entry processor.
Extract and clean the user's journal entry.

Examples:
- "today was really productive, got a lot done" → content same, mood=happy, tags=["work"]
- "feeling anxious about the interview tomorrow" → mood=anxious, tags=["work"], reminder_days=1
- "had a great trip to Goa with friends" → mood=happy, tags=["travel", "personal"]
- "need to think more about where my career is going" → mood=reflective, tags=["work"], reminder_days=14

Keep the content natural and as the user wrote it. Don't over-tag."""


# ── Journal node ──────────────────────────────────────────────────────────────


def journal_node(state: AgentState) -> dict:
    """
    1. Extract and enrich the journal entry using structured output
    2. Save directly to DB — no confirmation needed for journal entries
    3. Push a JournalEntryCard to the frontend
    4. Return a warm acknowledgment message
    """

    init_db()

    # ── Step 1: Extract structured journal data ───────────────────────────────
    last_message = state["messages"][-1]

    structured_llm = get_llm().with_structured_output(
        ExtractedJournalEntry,
        method="json_schema",
    )

    extracted: ExtractedJournalEntry = structured_llm.invoke(
        [
            {"role": "system", "content": JOURNAL_SYSTEM_PROMPT},
            {"role": "user", "content": str(last_message.content)},
        ]
    )

    print(f"[Journal] Extracted: {extracted}")

    # ── Step 2: Save directly — no interrupt for journal entries ─────────────
    session = get_session()
    try:
        entry = JournalEntry(
            content=extracted.content,
            mood=extracted.mood,
            tags=extracted.tags,
            reminder_days=extracted.reminder_days,
        )
        session.add(entry)
        session.commit()
        session.refresh(entry)
        print(f"[Journal] Saved entry id={entry.id}")
    except Exception as e:
        session.rollback()
        print(f"[Journal] DB error: {e}")
    finally:
        session.close()

    # ── Step 3: Push Generative UI card ──────────────────────────────────────
    push_ui_message(
        "journal_entry_card",
        extracted.model_dump(),
        id=f"journal-{entry.id}",
    )

    # ── Step 4: Warm acknowledgment ───────────────────────────────────────────
    mood_line = (
        f" Sounds like you're feeling {extracted.mood}." if extracted.mood else ""
    )
    reminder_line = (
        f" I'll remind you to revisit this in {extracted.reminder_days} days."
    )

    confirmation = f"📓 Logged.{mood_line}{reminder_line}"

    return {"messages": [AIMessage(content=confirmation)]}
