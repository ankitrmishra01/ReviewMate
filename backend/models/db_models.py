import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from backend.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(64), index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    diff_text = Column(Text, nullable=False)
    diff_summary_json = Column(Text, nullable=False)  # JSON string
    comments_json = Column(Text, nullable=False)      # JSON string
    comparison_json = Column(Text, nullable=True)    # Optional JSON string for baseline vs finetuned comparison
