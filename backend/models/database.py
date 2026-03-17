from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    category = Column(String, nullable=False)  # food, transport, bills, etc.
    description = Column(String, nullable=False)  # "dinner at restaurant"
    type = Column(String, default="expense")  # expense or income
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# SQLite for dev — one file, no setup needed
engine = create_engine("sqlite:///./personal_os.db", echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_session():
    """Get a DB session. Always close after use."""
    return SessionLocal()
