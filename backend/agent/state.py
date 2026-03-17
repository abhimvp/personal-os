from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from langgraph.graph.ui import AnyUIMessage, ui_message_reducer


class AgentState(TypedDict):
    # All conversation messages — add_messages merges instead of overwriting
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # Generative UI components pushed from the graph to React
    # This is what enables push_ui_message() later
    ui: Annotated[Sequence[AnyUIMessage], ui_message_reducer]

    # Which intent(s) were detected — we'll use this for routing
    intent: str
