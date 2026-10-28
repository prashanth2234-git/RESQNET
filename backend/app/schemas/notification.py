import datetime
from typing import Optional
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    request_id: Optional[int] = None
    notification_type: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True
