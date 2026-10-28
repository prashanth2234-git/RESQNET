import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

class DashboardSummary(BaseModel):
    total_active_requests: int
    critical_awaiting_review: int
    unassigned_requests: int
    responders_available: int
    assistance_provided: int
    awaiting_verification: int
    is_live_data: bool = True
    notice: str = "Live database values. RESQNET is a demonstration prototype, not an official emergency dispatch service."

class StatusDistribution(BaseModel):
    status: str
    count: int

class IncidentTypeDistribution(BaseModel):
    incident_type: str
    count: int

class PriorityDistribution(BaseModel):
    priority_band: str
    count: int

class DashboardAnalytics(BaseModel):
    status_distribution: List[StatusDistribution]
    incident_type_distribution: List[IncidentTypeDistribution]
    priority_distribution: List[PriorityDistribution]
    total_requests: int

class ActivityItem(BaseModel):
    id: int
    timestamp: datetime.datetime
    action_type: str
    actor_name: str
    description: str
    entity_id: Optional[int] = None
    tracking_code: Optional[str] = None
