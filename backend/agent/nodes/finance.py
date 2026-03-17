from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage
from langgraph.types import interrupt

from agent.state import AgentState
from agent.llm import get_llm
from models.database import get_session, Transaction, init_db


# ── Schema ────────────────────────────────────────────────────────────────────


class ExtractedTransaction(BaseModel):
    amount: float = Field(description="The numeric amount. Always positive.")
    currency: str = Field(description="Currency code. Default INR if not specified.")
    category: str = Field(
        description=(
            "Category of the transaction. One of: "
            "food, transport, shopping, bills, health, entertainment, travel, other"
        )
    )
    description: str = Field(
        description="Clean short description of what the expense was for."
    )
    type: str = Field(
        description="'expense' if money was spent, 'income' if money was received."
    )


FINANCE_SYSTEM_PROMPT = """You are a finance data extractor.
Extract transaction details from the user's message.

Examples:
- "spent 800 on dinner" → amount=800, category=food, description="dinner", type=expense
- "paid 500 for uber" → amount=500, category=transport, description="uber ride", type=expense
- "received 50000 salary" → amount=50000, category=other, description="salary", type=income
- "bought groceries for 1200" → amount=1200, category=food, description="groceries", type=expense

Always extract a clean, short description. Default currency to INR."""


# ── Finance node ──────────────────────────────────────────────────────────────


def finance_node(state: AgentState) -> dict:
    """
    1. Extract transaction data from the user's message using structured output
    2. Pause for human confirmation (interrupt)
    3. On approval → write to DB and confirm
    4. On rejection → acknowledge and do nothing
    """

    # Ensure DB tables exist
    init_db()

    # ── Step 1: Extract structured transaction data ───────────────────────────
    last_message = state["messages"][-1]

    structured_llm = get_llm().with_structured_output(
        ExtractedTransaction,
        method="json_schema",
    )

    extracted: ExtractedTransaction = structured_llm.invoke(
        [
            {"role": "system", "content": FINANCE_SYSTEM_PROMPT},
            {"role": "user", "content": str(last_message.content)},
        ]
    )

    print(f"[Finance] Extracted: {extracted}")

    # ── Step 2: Human-in-the-loop — pause before writing ─────────────────────
    # interrupt() pauses the graph here and sends this value to the frontend.
    # The graph will resume when the user submits a response.
    # Whatever the user submits becomes the return value of interrupt().
    user_decision = interrupt(
        {
            "type": "finance_confirm",  # frontend uses this to pick the right component
            "extracted": extracted.model_dump(),  # the data we're about to save
            "message": (
                f"I'll log this transaction:\n\n"
                f"  {'💸' if extracted.type == 'expense' else '💰'} "
                f"{extracted.currency} {extracted.amount:,.0f} — {extracted.description}\n"
                f"  Category: {extracted.category} | Type: {extracted.type}\n\n"
                f"Shall I save this?"
            ),
        }
    )

    # ── Step 3: Handle user decision ─────────────────────────────────────────
    if user_decision.get("approved"):
        # Write to database
        session = get_session()
        try:
            transaction = Transaction(
                amount=extracted.amount,
                currency=extracted.currency,
                category=extracted.category,
                description=extracted.description,
                type=extracted.type,
            )
            session.add(transaction)
            session.commit()
            session.refresh(transaction)

            print(f"[Finance] Saved transaction id={transaction.id}")

            confirmation_text = (
                f"✅ Saved! {extracted.currency} {extracted.amount:,.0f} "
                f"({extracted.description}) logged as {extracted.type}."
            )
        except Exception as e:
            session.rollback()
            confirmation_text = f"❌ Failed to save: {str(e)}"
            print(f"[Finance] DB error: {e}")
        finally:
            session.close()
    else:
        confirmation_text = "No problem, I won't log that transaction."

    return {"messages": [AIMessage(content=confirmation_text)]}
