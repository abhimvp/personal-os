from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from models.database import get_session, Transaction, MovieLog, JournalEntry, init_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


@app.get("/api/finance")
def get_finance():
    session = get_session()
    try:
        transactions = (
            session.query(Transaction).order_by(Transaction.created_at.desc()).all()
        )

        total_expense = sum(t.amount for t in transactions if t.type == "expense")
        total_income = sum(t.amount for t in transactions if t.type == "income")

        # Category breakdown
        category_totals: dict = {}
        for t in transactions:
            if t.type == "expense":
                category_totals[t.category] = (
                    category_totals.get(t.category, 0) + t.amount
                )

        return {
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "currency": t.currency,
                    "category": t.category,
                    "description": t.description,
                    "type": t.type,
                    "created_at": t.created_at.isoformat(),
                }
                for t in transactions
            ],
            "summary": {
                "total_expense": total_expense,
                "total_income": total_income,
                "net": total_income - total_expense,
                "by_category": category_totals,
            },
        }
    finally:
        session.close()


@app.get("/api/movies")
def get_movies():
    session = get_session()
    try:
        movies = session.query(MovieLog).order_by(MovieLog.created_at.desc()).all()

        status_counts: dict = {}
        for m in movies:
            status_counts[m.status] = status_counts.get(m.status, 0) + 1

        return {
            "movies": [
                {
                    "id": m.id,
                    "title": m.title,
                    "status": m.status,
                    "progress": m.progress,
                    "mood_tags": m.mood_tags or [],
                    "context_tags": m.context_tags or [],
                    "notes": m.notes,
                    "created_at": m.created_at.isoformat(),
                }
                for m in movies
            ],
            "summary": {
                "total": len(movies),
                "by_status": status_counts,
            },
        }
    finally:
        session.close()


@app.get("/api/journal")
def get_journal():
    session = get_session()
    try:
        entries = (
            session.query(JournalEntry).order_by(JournalEntry.created_at.desc()).all()
        )

        mood_counts: dict = {}
        for e in entries:
            if e.mood:
                mood_counts[e.mood] = mood_counts.get(e.mood, 0) + 1

        return {
            "entries": [
                {
                    "id": e.id,
                    "content": e.content,
                    "mood": e.mood,
                    "tags": e.tags or [],
                    "reminder_days": e.reminder_days,
                    "created_at": e.created_at.isoformat(),
                }
                for e in entries
            ],
            "summary": {
                "total": len(entries),
                "by_mood": mood_counts,
            },
        }
    finally:
        session.close()
