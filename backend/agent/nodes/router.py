from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
from agent.state import AgentState
from agent.llm import get_llm


# ── Schema ────────────────────────────────────────────────────────────────────
# Pydantic model that defines exactly what the LLM must return.
# Literal types constrain the LLM to only these exact values — no hallucination.


class IntentClassification(BaseModel):
    intent: Literal["finance", "movie", "journal", "chat"] = Field(
        description=(
            "The intent of the user's message. "
            "'finance' for expenses, income, money, spending. "
            "'movie' for films, shows, watching, tracking progress. "
            "'journal' for thoughts, notes, diary, one-liners. "
            "'chat' for general conversation, questions, anything else."
        )
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description="How confident you are in this classification."
    )


# ── System prompt ─────────────────────────────────────────────────────────────
ROUTER_SYSTEM_PROMPT = """You are an intent classifier for a personal life tracking assistant.

Your job is to classify what the user wants to do into exactly one of these categories:

- finance: logging expenses, income, transactions, money spent, bills paid
- movie: logging movies or shows watched, tracking progress, mood tags
- journal: writing a thought, memory, one-liner note, or diary entry  
- chat: general conversation, questions, anything that doesn't fit above

Examples:
- "I spent 500 on groceries" → finance
- "Watched Interstellar halfway through" → movie
- "Today was a good day" → journal
- "What can you help me with?" → chat
- "Log that I paid rent" → finance
- "Add Inception to my watchlist" → movie

Classify the LAST message from the user. Be decisive."""


# ── Router node ───────────────────────────────────────────────────────────────


def router_node(state: AgentState) -> dict:
    """
    Reads the latest user message and classifies intent using structured output.
    Sets state["intent"] which is then read by route_by_intent() in graph.py.
    """

    # Get the last human message from state
    last_message: BaseMessage = state["messages"][-1]

    # Build structured LLM — forces output to match IntentClassification schema
    # method="json_schema" is recommended for Gemini (more reliable than function_calling)
    structured_llm = get_llm().with_structured_output(
        IntentClassification,
        method="json_schema",
    )

    # Invoke with system prompt + the user's message content
    result: IntentClassification = structured_llm.invoke(
        [
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": str(last_message.content)},
        ]
    )

    print(f"[Router] intent={result.intent} confidence={result.confidence}")

    return {"intent": result.intent}
