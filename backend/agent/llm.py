from functools import lru_cache
from langchain_google_genai import ChatGoogleGenerativeAI


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    """
    Lazy-loaded LLM instance. Created on first call, cached after that.
    lru_cache ensures we only create one instance for the lifetime of the server.
    """
    return ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite-preview",
        temperature=1.0,
    )