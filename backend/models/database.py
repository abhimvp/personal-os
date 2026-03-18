from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    JSON,
    Text,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    type = Column(String, default="expense")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MovieLog(Base):
    __tablename__ = "movie_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    status = Column(String, default="watching")
    progress = Column(String, nullable=True)
    mood_tags = Column(JSON, default=list)
    context_tags = Column(JSON, default=list)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text, nullable=False)  # the actual journal text
    mood = Column(String, nullable=True)  # happy, reflective, anxious, etc.
    tags = Column(JSON, default=list)  # ["work", "personal", "travel"]
    reminder_days = Column(Integer, default=7)  # remind to revisit in N days
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


engine = create_engine("sqlite:///./personal_os.db", echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    return SessionLocal()
