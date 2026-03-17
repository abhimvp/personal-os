from agent.state import AgentState


def router_node(state: AgentState) -> dict:
    """
    Classifies the user's message and sets intent.
    Will use LLM structured output in Step 3.
    """
    # Stub — just pass through for now
    return {"intent": "unknown"}
