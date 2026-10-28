import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class SynchronizationRecord(Base):
    __tablename__ = "synchronization_records"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(128), unique=True, index=True, nullable=False)
    client_local_id = Column(String(128), nullable=False)
    server_request_id = Column(Integer, ForeignKey("assistance_requests.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sync_status = Column(String(50), default="SUCCESS")
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    request = relationship("AssistanceRequest")
    user = relationship("User")
