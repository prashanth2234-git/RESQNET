import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

class RequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    incident_type: str
    description: str = Field(..., min_length=5)
    location_name: str = Field(..., min_length=2)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    people_affected: int = Field(1, ge=1)
    people_urgent: int = Field(0, ge=0)
    assistance_category: str
    
    # Urgency & vulnerability indicators
    is_immediate_threat: bool = False
    is_medical_emergency: bool = False
    is_vulnerable_present: bool = False
    is_essential_unavailable: bool = False
    
    safe_contact_method: str = "Phone"
    contact_details: Optional[str] = None
    accessibility_medical_notes: Optional[str] = None
    
    # Offline sync support
    idempotency_key: Optional[str] = None
    client_local_id: Optional[str] = None

class RequestUpdate(BaseModel):
    safe_contact_method: Optional[str] = None
    contact_details: Optional[str] = None
    accessibility_medical_notes: Optional[str] = None

class RequestVerify(BaseModel):
    verification_notes: Optional[str] = "Verified by coordinator triage desk."

class PriorityOverrideRequest(BaseModel):
    override_score: int = Field(..., ge=0, le=100)
    override_band: str
    reason: str = Field(..., min_length=5)

class AssignRequest(BaseModel):
    responder_id: int
    override_workload_reason: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    new_status: str
    explanation: Optional[str] = None
    is_override: bool = False
    assistance_confirmed: Optional[bool] = False
    assistance_notes: Optional[str] = None
    closure_explanation: Optional[str] = None
    override_reason: Optional[str] = None

class StatusHistoryResponse(BaseModel):
    id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by_name: Optional[str] = None
    explanation: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class AssignmentBrief(BaseModel):
    id: int
    responder_id: int
    responder_team: str
    status: str
    assigned_at: datetime.datetime
    accepted_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    assistance_notes: Optional[str] = None

    class Config:
        from_attributes = True

class RequestResponse(BaseModel):
    id: int
    tracking_code: str
    citizen_id: Optional[int] = None
    citizen_name: Optional[str] = None
    title: str
    incident_type: str
    description: str
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    people_affected: int
    people_urgent: int
    assistance_category: str
    
    is_immediate_threat: bool
    is_medical_emergency: bool
    is_vulnerable_present: bool
    is_essential_unavailable: bool
    
    safe_contact_method: str
    contact_details: Optional[str] = None
    accessibility_medical_notes: Optional[str] = None
    status: str
    
    calculated_priority_score: int
    priority_band: str
    priority_factors: List[Dict[str, Any]] = []
    priority_explanation: str
    priority_calculated_at: Optional[datetime.datetime] = None
    
    # Priority Override
    priority_override_score: Optional[int] = None
    priority_override_band: Optional[str] = None
    priority_override_reason: Optional[str] = None
    priority_override_by_name: Optional[str] = None
    priority_override_at: Optional[datetime.datetime] = None
    
    # Effective values
    effective_priority_score: int
    effective_priority_band: str
    
    # Verification
    verification_notes: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime.datetime] = None
    
    # Identifiers
    idempotency_key: Optional[str] = None
    client_local_id: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    # Related data
    status_history: List[StatusHistoryResponse] = []
    assignments: List[AssignmentBrief] = []

    class Config:
        from_attributes = True

class RequestListResponse(BaseModel):
    items: List[RequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
