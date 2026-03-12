from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages


# This is the shared state passed between all nodes
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


# Stub node — just echoes back for now
def stub_node(state: AgentState):
    print("Graph received:", state["messages"][-1].content)
    return {}


# Build the graph
workflow = StateGraph(AgentState)
workflow.add_node("stub", stub_node)
workflow.add_edge(START, "stub")
workflow.add_edge("stub", END)

# This is what LangGraph server looks for
graph = workflow.compile()