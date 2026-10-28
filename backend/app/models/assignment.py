import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class AssignmentStatus:
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REASSIGNED = "REASSIGNED"
    CANCELLED = "CANCELLED"
    ALL = [ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, REASSIGNED, CANCELLED]

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("assistance_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    responder_id = Column(Integer, ForeignKey("responder_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    status = Column(String(50), default=AssignmentStatus.ASSIGNED, index=True)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    assistance_notes = Column(Text, nullable=True)
    override_workload_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    request = relationship("AssistanceRequest", back_populates="assignments")
    responder = relationship("ResponderProfile", back_populates="assignments")
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id])
