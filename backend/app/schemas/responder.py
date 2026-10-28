import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ResponderCreate(BaseModel):
    user_id: int
    team: str = Field(..., min_length=2)
    supported_categories: List[str]
    max_concurrent_assignments: int = Field(3, ge=1, le=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ResponderUpdateAvailability(BaseModel):
    availability: str = Field(..., pattern="^(AVAILABLE|BUSY|OFF_DUTY)$")

class ResponderResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    team: str
    supported_categories: List[str]
    availability: str
    max_concurrent_assignments: int
    current_assignment_count: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_active_at: datetime.datetime
    created_at: datetime.datetime

    class Config:
        from_attributes = True
