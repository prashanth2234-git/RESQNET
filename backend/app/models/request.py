import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class IncidentType:
    FLOOD = "Flood"
    FIRE = "Fire"
    STORM = "Storm"
    EARTHQUAKE = "Earthquake"
    LANDSLIDE = "Landslide"
    MEDICAL = "Medical assistance"
    OTHER = "Other"
    ALL = [FLOOD, FIRE, STORM, EARTHQUAKE, LANDSLIDE, MEDICAL, OTHER]

class AssistanceCategory:
    MEDICAL = "Medical assistance"
    RESCUE = "Rescue"
    FOOD_WATER = "Food and water"
    SHELTER = "Shelter"
    EVACUATION = "Evacuation support"
    ESSENTIAL_SUPPLIES = "Essential supplies"
    OTHER = "Other"
    ALL = [MEDICAL, RESCUE, FOOD_WATER, SHELTER, EVACUATION, ESSENTIAL_SUPPLIES, OTHER]

class RequestStatus:
    RECEIVED = "RECEIVED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    EN_ROUTE = "EN_ROUTE"
    ASSISTANCE_PROVIDED = "ASSISTANCE_PROVIDED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    ALL = [RECEIVED, VERIFIED, ASSIGNED, EN_ROUTE, ASSISTANCE_PROVIDED, CLOSED, REJECTED, CANCELLED]

class PriorityBand:
    CRITICAL = "CRITICAL"  # 75 - 100
    HIGH = "HIGH"          # 50 - 74
    MEDIUM = "MEDIUM"      # 25 - 49
    LOW = "LOW"            # 0 - 24
    ALL = [CRITICAL, HIGH, MEDIUM, LOW]

class AssistanceRequest(Base):
    __tablename__ = "assistance_requests"

    id = Column(Integer, primary_key=True, index=True)
    tracking_code = Column(String(32), unique=True, index=True, nullable=False)
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Request Content
    title = Column(String(255), nullable=False)
    incident_type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    people_affected = Column(Integer, default=1)
    people_urgent = Column(Integer, default=0)
    assistance_category = Column(String(100), nullable=False, index=True)
    
    # Priority & Triage Indicators
    is_immediate_threat = Column(Boolean, default=False)
    is_medical_emergency = Column(Boolean, default=False)
    is_vulnerable_present = Column(Boolean, default=False)
    is_essential_unavailable = Column(Boolean, default=False)
    
    # Contact & Safety
    safe_contact_method = Column(String(50), default="Phone")
    contact_details = Column(String(255), nullable=True)
    accessibility_medical_notes = Column(Text, nullable=True)
    
    # Lifecycle & Status
    status = Column(String(50), default=RequestStatus.RECEIVED, index=True)
    
    # Priority Engine Scoring
    calculated_priority_score = Column(Integer, default=0)
    priority_band = Column(String(50), default=PriorityBand.LOW, index=True)
    priority_factors_json = Column(Text, default="{}")
    priority_explanation = Column(Text, default="")
    priority_calculated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Priority Override (Coordinator only)
    priority_override_score = Column(Integer, nullable=True)
    priority_override_band = Column(String(50), nullable=True)
    priority_override_reason = Column(Text, nullable=True)
    priority_override_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    priority_override_at = Column(DateTime, nullable=True)
    
    # Verification (Coordinator only)
    verification_notes = Column(Text, nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Offline sync support
    idempotency_key = Column(String(128), unique=True, index=True, nullable=True)
    client_local_id = Column(String(128), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    citizen = relationship("User", back_populates="requests", foreign_keys=[citizen_id])
    verified_by = relationship("User", foreign_keys=[verified_by_user_id])
    priority_override_by = relationship("User", foreign_keys=[priority_override_by_user_id])
    assignments = relationship("Assignment", back_populates="request", cascade="all, delete-orphan", order_by="Assignment.id.desc()")
    status_history = relationship("StatusHistory", back_populates="request", cascade="all, delete-orphan", order_by="StatusHistory.timestamp.asc()")

    @property
    def effective_priority_score(self) -> int:
        if self.priority_override_score is not None:
            return self.priority_override_score
        return self.calculated_priority_score

    @property
    def effective_priority_band(self) -> str:
        if self.priority_override_band is not None:
            return self.priority_override_band
        return self.priority_band
