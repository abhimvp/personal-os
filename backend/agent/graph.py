from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, START, END

from agent.state import AgentState
from agent.llm import get_llm
from agent.nodes.router import router_node
from agent.nodes.finance import finance_node
from agent.nodes.movie import movie_node
from agent.nodes.journal import journal_node
from models.database import init_db   # ← add this

# Initialize DB tables when the graph module loads
init_db() 

# ── Core chat node ────────────────────────────────────────────────────────────
# This is the main conversational node — it calls Gemini with the full
# message history and streams the response back to the frontend.


async def chat_node(state: AgentState) -> dict:
    system_prompt = (
        "You are Jarvis, a personal life assistant. "
        "You help users log movies, track expenses, write journal entries, and plan trips. "
        "Be concise and friendly."
    )

    messages = [{"role": "system", "content": system_prompt}] + list(state["messages"])

    response: AIMessage = await get_llm().ainvoke(messages)  # ← call get_llm() here

    return {"messages": [response]}


# ── Routing function ──────────────────────────────────────────────────────────
# This function reads state AFTER router_node runs and decides which node
# to go to next. Returns a node name as a string.
# In Step 3 we'll replace "chat" with real intent-based routing.


def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent", "unknown")

    if intent == "finance":
        return "finance"
    elif intent == "movie":
        return "movie"
    elif intent == "journal":
        return "journal"
    else:
        # Default — general conversation goes to chat
        return "chat"


# ── Build the graph ───────────────────────────────────────────────────────────

workflow = StateGraph(AgentState)

# Register all nodes
workflow.add_node("router", router_node)
workflow.add_node("chat", chat_node)
workflow.add_node("finance", finance_node)
workflow.add_node("movie", movie_node)
workflow.add_node("journal", journal_node)

# Entry point — always goes to router first
workflow.add_edge(START, "router")

# After router runs, use route_by_intent to pick the next node
workflow.add_conditional_edges(
    "router",  # from this node
    route_by_intent,  # call this function to decide where to go
    {  # map return values to node names
        "chat": "chat",
        "finance": "finance",
        "movie": "movie",
        "journal": "journal",
    },
)

# All paths end after their respective node runs
workflow.add_edge("chat", END)
workflow.add_edge("finance", END)
workflow.add_edge("movie", END)
workflow.add_edge("journal", END)

# Compile — this is what LangGraph server picks up
graph = workflow.compile()
