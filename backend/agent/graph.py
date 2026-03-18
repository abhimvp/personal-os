from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from agent.state import AgentState
from agent.llm import get_llm
from agent.nodes.router import router_node
from agent.nodes.finance import finance_node
from agent.nodes.movie import movie_node
from agent.nodes.journal import journal_node
from models.database import init_db

init_db()


# ── Chat node ──────────────────────────────────────────────────────────────────


async def chat_node(state: AgentState) -> dict:
    system_prompt = (
        "You are Jarvis, a personal life assistant. "
        "You help users log movies, track expenses, write journal entries, and plan trips. "
        "Be concise and friendly."
    )
    messages = [{"role": "system", "content": system_prompt}] + list(state["messages"])
    response: AIMessage = await get_llm().ainvoke(messages)
    return {"messages": [response]}


# ── Fan-out function ───────────────────────────────────────────────────────────
# This is the core of multi-intent. Instead of routing to ONE node,
# we use the Send API to dispatch to MULTIPLE nodes in parallel.
# Each Send() creates an independent branch with its own copy of state.


def fan_out_by_intent(state: AgentState) -> list[Send] | str:
    """
    Reads the intent field (comma-separated) and fans out to all detected nodes.
    Returns a list of Send objects for parallel execution,
    or a single node name string for single intent.
    """
    intent_str = state.get("intent", "chat")
    intents = [i.strip() for i in intent_str.split(",")]

    # Remove duplicates while preserving order
    seen = set()
    unique_intents = []
    for i in intents:
        if i not in seen:
            seen.add(i)
            unique_intents.append(i)

    print(f"[Graph] Fanning out to: {unique_intents}")

    # Single intent — return node name directly (no Send needed)
    if len(unique_intents) == 1:
        intent = unique_intents[0]
        if intent == "finance":
            return "finance"
        elif intent == "movie":
            return "movie"
        elif intent == "journal":
            return "journal"
        else:
            return "chat"

    # Multiple intents — use Send API for parallel execution
    node_map = {
        "finance": "finance",
        "movie": "movie",
        "journal": "journal",
        "chat": "chat",
    }

    sends = []
    for intent in unique_intents:
        node = node_map.get(intent, "chat")
        # Send passes the current state to each node independently
        sends.append(Send(node, state))

    return sends


# ── Build the graph ────────────────────────────────────────────────────────────

workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("chat", chat_node)
workflow.add_node("finance", finance_node)
workflow.add_node("movie", movie_node)
workflow.add_node("journal", journal_node)

workflow.add_edge(START, "router")

# Conditional edges using fan_out_by_intent
# Can return either a string (single node) or list of Send objects (parallel)
workflow.add_conditional_edges(
    "router",
    fan_out_by_intent,
    {
        "chat": "chat",
        "finance": "finance",
        "movie": "movie",
        "journal": "journal",
    },
)

workflow.add_edge("chat", END)
workflow.add_edge("finance", END)
workflow.add_edge("movie", END)
workflow.add_edge("journal", END)

graph = workflow.compile()
