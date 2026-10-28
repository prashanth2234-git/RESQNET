import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class NotificationType:
    NEW_REQUEST = "NEW_REQUEST"
    STATUS_CHANGE = "STATUS_CHANGE"
    ASSIGNMENT = "ASSIGNMENT"
    PRIORITY_ALERT = "PRIORITY_ALERT"
    CRITICAL_TRIAGE = "CRITICAL_TRIAGE"
    ALL = [NEW_REQUEST, STATUS_CHANGE, ASSIGNMENT, PRIORITY_ALERT, CRITICAL_TRIAGE]

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    target_role = Column(String(50), nullable=True, index=True)  # E.g. "COORDINATOR", "RESPONDER"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    request_id = Column(Integer, ForeignKey("assistance_requests.id", ondelete="SET NULL"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
    request = relationship("AssistanceRequest", foreign_keys=[request_id])
