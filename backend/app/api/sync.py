import json
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.user import User
from app.models.request import AssistanceRequest, RequestStatus
from app.models.status_history import StatusHistory
from app.models.sync_record import SynchronizationRecord
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse, SyncItemResult, SyncStatusResponse
from app.services.priority_engine import priority_engine
from app.services.notification_service import notification_service
from app.api.deps import get_optional_current_user

router = APIRouter(prefix="/sync", tags=["Offline Synchronization"])

def generate_tracking_code(db: Session) -> str:
    count = db.query(AssistanceRequest).count() + 1
    code = f"REQ-{count:04d}"
    while db.query(AssistanceRequest).filter(AssistanceRequest.tracking_code == code).first():
        count += 1
        code = f"REQ-{count:04d}"
    return code

@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status():
    """Health & synchronization connectivity check for client devices."""
    return SyncStatusResponse(
        online=True,
        server_time=datetime.datetime.utcnow(),
        system_status="OPERATIONAL"
    )

@router.post("/requests", response_model=SyncBatchResponse)
def sync_offline_requests(
    batch: SyncBatchRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    results: List[SyncItemResult] = []
    successful = 0

    for item in batch.items:
        local_id = item.client_local_id or str(uuid.uuid4())
        idempotency_key = item.idempotency_key or f"offline-{local_id}"

        try:
            # 1. Check if previously synchronized via SynchronizationRecord
            existing_record = db.query(SynchronizationRecord).filter(
                SynchronizationRecord.idempotency_key == idempotency_key
            ).first()

            if existing_record:
                req = db.query(AssistanceRequest).filter(AssistanceRequest.id == existing_record.server_request_id).first()
                results.append(SyncItemResult(
                    client_local_id=local_id,
                    server_request_id=existing_record.server_request_id,
                    tracking_code=req.tracking_code if req else None,
                    idempotency_key=idempotency_key,
                    status="EXISTING_IDEMPOTENT"
                ))
                successful += 1
                continue

            # 2. Check directly on AssistanceRequest table by idempotency_key or client_local_id
            existing_req = db.query(AssistanceRequest).filter(
                or_(
                    AssistanceRequest.idempotency_key == idempotency_key,
                    AssistanceRequest.client_local_id == local_id
                )
            ).first()

            if existing_req:
                # Attempt to register sync record idempotently
                try:
                    sync_rec = SynchronizationRecord(
                        idempotency_key=idempotency_key,
                        client_local_id=local_id,
                        server_request_id=existing_req.id,
                        user_id=current_user.id if current_user else None,
                        sync_status="SUCCESS"
                    )
                    db.add(sync_rec)
                    db.commit()
                except Exception:
                    db.rollback()

                results.append(SyncItemResult(
                    client_local_id=local_id,
                    server_request_id=existing_req.id,
                    tracking_code=existing_req.tracking_code,
                    idempotency_key=idempotency_key,
                    status="EXISTING_IDEMPOTENT"
                ))
                successful += 1
                continue

            # 3. Process new request
            now = datetime.datetime.utcnow()
            priority_res = priority_engine.calculate(
                is_immediate_threat=item.is_immediate_threat,
                is_medical_emergency=item.is_medical_emergency,
                people_urgent=item.people_urgent,
                is_vulnerable_present=item.is_vulnerable_present,
                is_essential_unavailable=item.is_essential_unavailable,
                created_at=now,
                now=now,
            )

            tracking_code = generate_tracking_code(db)
            factors_dict = [f.model_dump() for f in priority_res.factors]

            new_req = AssistanceRequest(
                tracking_code=tracking_code,
                citizen_id=current_user.id if current_user else None,
                title=item.title.strip(),
                incident_type=item.incident_type.strip(),
                description=item.description.strip(),
                location_name=item.location_name.strip(),
                latitude=item.latitude,
                longitude=item.longitude,
                people_affected=item.people_affected,
                people_urgent=item.people_urgent,
                assistance_category=item.assistance_category.strip(),
                is_immediate_threat=item.is_immediate_threat,
                is_medical_emergency=item.is_medical_emergency,
                is_vulnerable_present=item.is_vulnerable_present,
                is_essential_unavailable=item.is_essential_unavailable,
                safe_contact_method=item.safe_contact_method,
                contact_details=item.contact_details.strip() if item.contact_details else None,
                accessibility_medical_notes=item.accessibility_medical_notes.strip() if item.accessibility_medical_notes else None,
                status=RequestStatus.RECEIVED,
                calculated_priority_score=priority_res.total_score,
                priority_band=priority_res.priority_band,
                priority_factors_json=json.dumps(factors_dict),
                priority_explanation=priority_res.explanation,
                priority_calculated_at=now,
                idempotency_key=idempotency_key,
                client_local_id=local_id,
                created_at=now,
                updated_at=now,
            )
            db.add(new_req)
            db.commit()
            db.refresh(new_req)

            # Record status history
            hist = StatusHistory(
                request_id=new_req.id,
                previous_status=None,
                new_status=RequestStatus.RECEIVED,
                changed_by_user_id=current_user.id if current_user else None,
                explanation="Synchronized from offline device queue."
            )
            db.add(hist)

            # Record sync record idempotently
            try:
                sync_rec = SynchronizationRecord(
                    idempotency_key=idempotency_key,
                    client_local_id=local_id,
                    server_request_id=new_req.id,
                    user_id=current_user.id if current_user else None,
                    sync_status="SUCCESS"
                )
                db.add(sync_rec)
                db.commit()
            except Exception:
                db.rollback()

            # Notify coordinators
            try:
                notification_service.notify_new_request(
                    db=db,
                    request_id=new_req.id,
                    tracking_code=new_req.tracking_code,
                    incident_type=new_req.incident_type,
                    priority_band=new_req.priority_band
                )
            except Exception:
                pass

            results.append(SyncItemResult(
                client_local_id=local_id,
                server_request_id=new_req.id,
                tracking_code=new_req.tracking_code,
                idempotency_key=idempotency_key,
                status="CREATED"
            ))
            successful += 1

        except Exception as ex:
            db.rollback()
            # Double check if another concurrent request or transaction created it
            concurrent_req = db.query(AssistanceRequest).filter(
                or_(
                    AssistanceRequest.idempotency_key == idempotency_key,
                    AssistanceRequest.client_local_id == local_id
                )
            ).first()
            if concurrent_req:
                results.append(SyncItemResult(
                    client_local_id=local_id,
                    server_request_id=concurrent_req.id,
                    tracking_code=concurrent_req.tracking_code,
                    idempotency_key=idempotency_key,
                    status="EXISTING_IDEMPOTENT"
                ))
                successful += 1
            else:
                results.append(SyncItemResult(
                    client_local_id=local_id,
                    server_request_id=None,
                    tracking_code=None,
                    idempotency_key=idempotency_key,
                    status="ERROR",
                    error=str(ex)
                ))

    return SyncBatchResponse(
        total_received=len(batch.items),
        successful_count=successful,
        results=results
    )
