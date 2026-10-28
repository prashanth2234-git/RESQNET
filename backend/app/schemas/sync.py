import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.request import RequestCreate

class SyncItemResult(BaseModel):
    client_local_id: str
    server_request_id: Optional[int] = None
    tracking_code: Optional[str] = None
    idempotency_key: str
    status: str  # "CREATED", "EXISTING_IDEMPOTENT", "ERROR"
    error: Optional[str] = None

class SyncBatchRequest(BaseModel):
    items: List[RequestCreate]

class SyncBatchResponse(BaseModel):
    total_received: int
    successful_count: int
    results: List[SyncItemResult]

class SyncStatusResponse(BaseModel):
    online: bool = True
    server_time: datetime.datetime
    system_status: str = "OPERATIONAL"
