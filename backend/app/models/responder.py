import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ResponderAvailability:
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFF_DUTY = "OFF_DUTY"
    ALL = [AVAILABLE, BUSY, OFF_DUTY]

class ResponderProfile(Base):
    __tablename__ = "responder_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    team = Column(String(100), nullable=False)
    supported_categories = Column(String(500), nullable=False, default="[]")  # JSON encoded list of categories
    availability = Column(String(50), default=ResponderAvailability.AVAILABLE, index=True)
    max_concurrent_assignments = Column(Integer, default=3)
    current_assignment_count = Column(Integer, default=0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_active_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="responder_profile")
    assignments = relationship("Assignment", back_populates="responder", cascade="all, delete-orphan")
