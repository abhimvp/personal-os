from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
from langgraph.types import Send

from agent.state import AgentState
from agent.llm import get_llm


# ── Schema ────────────────────────────────────────────────────────────────────


class IntentClassification(BaseModel):
    intents: list[Literal["finance", "movie", "journal", "chat"]] = Field(
        description=(
            "List of ALL intents detected in the message. "
            "Can contain multiple if the user mentions multiple actions. "
            "Always include at least one. Use ['chat'] for general conversation."
        )
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description="Overall confidence in the classification."
    )


ROUTER_SYSTEM_PROMPT = """You are an intent classifier for a personal life tracking assistant.

Classify the user's message into one or MORE of these categories:

- finance: logging expenses, income, transactions, money spent, bills paid
- movie: logging movies or shows watched, tracking progress, mood tags
- journal: writing a thought, memory, one-liner note, or diary entry
- chat: general conversation, questions, anything that doesn't fit above

IMPORTANT: A single message can contain MULTIPLE intents.

Examples:
- "I spent 500 on groceries" → ["finance"]
- "Watched Interstellar halfway" → ["movie"]
- "Today was good, spent 800 on dinner" → ["journal", "finance"]
- "Watched The Bear and paid my rent" → ["movie", "finance"]
- "Good day overall, watched a movie and spent 200 on coffee" → ["journal", "movie", "finance"]
- "What can you help me with?" → ["chat"]

Return ALL detected intents. Never return an empty list."""


# ── Router node ────────────────────────────────────────────────────────────────


def router_node(state: AgentState) -> dict:
    """
    Classifies the user message into one or more intents.
    Returns intent list — graph.py uses this to fan out via Send API.
    """
    last_message: BaseMessage = state["messages"][-1]

    structured_llm = get_llm().with_structured_output(
        IntentClassification,
        method="json_schema",
    )

    result: IntentClassification = structured_llm.invoke(
        [
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": str(last_message.content)},
        ]
    )

    print(f"[Router] intents={result.intents} confidence={result.confidence}")

    # Store intents as comma-separated string for state
    return {"intent": ",".join(result.intents)}
