import datetime
from typing import Optional
from pydantic import BaseModel, Field

class AssignmentCompleteRequest(BaseModel):
    assistance_notes: str = Field(..., min_length=10)

class AssignmentDetailedResponse(BaseModel):
    id: int
    request_id: int
    request_tracking_code: str
    request_title: str
    request_incident_type: str
    request_location_name: str
    request_latitude: Optional[float] = None
    request_longitude: Optional[float] = None
    request_priority_band: str
    request_priority_score: int
    request_safe_contact_method: str
    request_contact_details: Optional[str] = None
    request_status: str
    
    responder_id: int
    responder_team: str
    status: str
    assigned_at: datetime.datetime
    accepted_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    assistance_notes: Optional[str] = None
    override_workload_reason: Optional[str] = None

    class Config:
        from_attributes = True
