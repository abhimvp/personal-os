from pydantic import BaseModel, Field
from typing import Optional
from langchain_core.messages import AIMessage
from langgraph.types import interrupt
from langgraph.graph.ui import push_ui_message

from agent.state import AgentState
from agent.llm import get_llm
from models.database import get_session, MovieLog, init_db


# ── Schema ────────────────────────────────────────────────────────────────────


class ExtractedMovieLog(BaseModel):
    title: str = Field(description="The title of the movie or show.")
    status: str = Field(
        description=("Viewing status. One of: " "watching, completed, dropped, planned")
    )
    progress: Optional[str] = Field(
        default=None,
        description="How far through. E.g. 'halfway', 'episode 3', '1 hour in'.",
    )
    mood_tags: list[str] = Field(
        default_factory=list,
        description=(
            "Emotional or thematic tags. E.g. "
            "'Emotional Climax', 'Inspirational', 'Dark', 'Feel Good'."
        ),
    )
    context_tags: list[str] = Field(
        default_factory=list,
        description=(
            "When or how to watch. E.g. "
            "'Watch on Sunday Morning', 'Great for Road Trips'."
        ),
    )
    notes: Optional[str] = Field(
        default=None, description="Any extra notes the user mentioned."
    )


MOVIE_SYSTEM_PROMPT = """You are a movie and TV show log extractor.
Extract viewing details from the user's message.

Examples:
- "watched Interstellar halfway through" → title=Interstellar, status=watching, progress=halfway
- "finished The Bear, it was emotional" → title=The Bear, status=completed, mood_tags=["Emotional"]
- "adding Dune to watchlist" → title=Dune, status=planned
- "watched 3 episodes of Succession" → title=Succession, status=watching, progress=episode 3

Infer mood tags and context tags only if clearly implied. Keep notes brief."""


# ── Movie node ────────────────────────────────────────────────────────────────


def movie_node(state: AgentState) -> dict:
    """
    1. Extract movie log data using structured output
    2. Push a MovieLogCard UI component to the frontend (Generative UI)
    3. Pause for human confirmation (interrupt)
    4. On approval → write to DB
    5. On rejection → acknowledge
    """

    init_db()

    # ── Step 1: Extract structured movie data ─────────────────────────────────
    last_message = state["messages"][-1]

    structured_llm = get_llm().with_structured_output(
        ExtractedMovieLog,
        method="json_schema",
    )

    extracted: ExtractedMovieLog = structured_llm.invoke(
        [
            {"role": "system", "content": MOVIE_SYSTEM_PROMPT},
            {"role": "user", "content": str(last_message.content)},
        ]
    )

    print(f"[Movie] Extracted: {extracted}")

    # ── Step 2: Push Generative UI component ──────────────────────────────────
    # This sends a MovieLogCard component to the React frontend.
    # The component name "movie_log_card" must match what we register in ui.tsx
    push_ui_message(
        "movie_log_card",
        extracted.model_dump(),
        id=f"movie-{extracted.title.lower().replace(' ', '-')}",
    )

    # ── Step 3: Human-in-the-loop ─────────────────────────────────────────────
    user_decision = interrupt(
        {
            "type": "movie_confirm",
            "extracted": extracted.model_dump(),
            "message": f"Log '{extracted.title}' as {extracted.status}?",
        }
    )

    # ── Step 4: Handle decision ───────────────────────────────────────────────
    if user_decision.get("approved"):
        session = get_session()
        try:
            log = MovieLog(
                title=extracted.title,
                status=extracted.status,
                progress=extracted.progress,
                mood_tags=extracted.mood_tags,
                context_tags=extracted.context_tags,
                notes=extracted.notes,
            )
            session.add(log)
            session.commit()
            print(f"[Movie] Saved: {extracted.title}")
            confirmation = f"✅ Logged '{extracted.title}' as {extracted.status}."
        except Exception as e:
            session.rollback()
            confirmation = f"❌ Failed to save: {str(e)}"
        finally:
            session.close()
    else:
        confirmation = f"No problem, '{extracted.title}' won't be logged."

    return {"messages": [AIMessage(content=confirmation)]}
