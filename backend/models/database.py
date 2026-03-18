from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON
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
    status = Column(String, default="watching")  # watching, completed, dropped, planned
    progress = Column(String, nullable=True)  # "halfway", "1hr in", "episode 3", etc.
    mood_tags = Column(JSON, default=list)  # ["Emotional Climax", "Inspirational"]
    context_tags = Column(JSON, default=list)  # ["Watch on Sunday Morning"]
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


engine = create_engine("sqlite:///./personal_os.db", echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    return SessionLocal()
