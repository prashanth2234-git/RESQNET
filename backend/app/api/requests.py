import json
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.request import AssistanceRequest, RequestStatus, PriorityBand
from app.models.responder import ResponderProfile, ResponderAvailability
from app.models.assignment import Assignment, AssignmentStatus
from app.models.status_history import StatusHistory
from app.schemas.request import (
    RequestCreate, RequestUpdate, RequestVerify, PriorityOverrideRequest,
    AssignRequest, StatusUpdateRequest, RequestResponse, RequestListResponse,
    StatusHistoryResponse, AssignmentBrief
)
from app.services.priority_engine import priority_engine
from app.services.status_workflow import status_workflow_service
from app.services.assignment_service import assignment_service
from app.services.notification_service import notification_service
from app.services.audit_service import audit_service
from app.api.deps import (
    get_current_user, get_optional_current_user,
    require_coordinator, require_roles
)

router = APIRouter(prefix="/requests", tags=["Assistance Requests"])

def generate_tracking_code(db: Session) -> str:
    """Generate a unique human-friendly tracking code like REQ-1042."""
    count = db.query(AssistanceRequest).count() + 1
    return f"REQ-{count:04d}"

def serialize_request(req: AssistanceRequest) -> RequestResponse:
    factors = []
    if req.priority_factors_json:
        try:
            parsed = json.loads(req.priority_factors_json)
            factors = parsed if isinstance(parsed, list) else []
        except Exception:
            factors = []

    history_items = []
    for h in req.status_history:
        changed_by_name = h.changed_by.full_name if h.changed_by else "System / Anonymous"
        history_items.append(StatusHistoryResponse(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            changed_by_name=changed_by_name,
            explanation=h.explanation,
            timestamp=h.timestamp
        ))

    assignment_items = []
    for a in req.assignments:
        team_name = a.responder.team if a.responder else "Unknown Unit"
        assignment_items.append(AssignmentBrief(
            id=a.id,
            responder_id=a.responder_id,
            responder_team=team_name,
            status=a.status,
            assigned_at=a.assigned_at,
            accepted_at=a.accepted_at,
            completed_at=a.completed_at,
            assistance_notes=a.assistance_notes
        ))

    return RequestResponse(
        id=req.id,
        tracking_code=req.tracking_code,
        citizen_id=req.citizen_id,
        citizen_name=req.citizen.full_name if req.citizen else "Anonymous / Offline Citizen",
        title=req.title,
        incident_type=req.incident_type,
        description=req.description,
        location_name=req.location_name,
        latitude=req.latitude,
        longitude=req.longitude,
        people_affected=req.people_affected,
        people_urgent=req.people_urgent,
        assistance_category=req.assistance_category,
        is_immediate_threat=req.is_immediate_threat,
        is_medical_emergency=req.is_medical_emergency,
        is_vulnerable_present=req.is_vulnerable_present,
        is_essential_unavailable=req.is_essential_unavailable,
        safe_contact_method=req.safe_contact_method,
        contact_details=req.contact_details,
        accessibility_medical_notes=req.accessibility_medical_notes,
        status=req.status,
        calculated_priority_score=req.calculated_priority_score,
        priority_band=req.priority_band,
        priority_factors=factors,
        priority_explanation=req.priority_explanation,
        priority_calculated_at=req.priority_calculated_at,
        priority_override_score=req.priority_override_score,
        priority_override_band=req.priority_override_band,
        priority_override_reason=req.priority_override_reason,
        priority_override_by_name=req.priority_override_by.full_name if req.priority_override_by else None,
        priority_override_at=req.priority_override_at,
        effective_priority_score=req.effective_priority_score,
        effective_priority_band=req.effective_priority_band,
        verification_notes=req.verification_notes,
        verified_by_name=req.verified_by.full_name if req.verified_by else None,
        verified_at=req.verified_at,
        idempotency_key=req.idempotency_key,
        client_local_id=req.client_local_id,
        created_at=req.created_at,
        updated_at=req.updated_at,
        status_history=history_items,
        assignments=assignment_items
    )

@router.post("", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    request_in: RequestCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Idempotency check for offline sync retries
    if request_in.idempotency_key:
        existing = db.query(AssistanceRequest).filter(
            AssistanceRequest.idempotency_key == request_in.idempotency_key
        ).first()
        if existing:
            return serialize_request(existing)

    # Calculate explainable priority score
    now = datetime.datetime.utcnow()
    priority_res = priority_engine.calculate(
        is_immediate_threat=request_in.is_immediate_threat,
        is_medical_emergency=request_in.is_medical_emergency,
        people_urgent=request_in.people_urgent,
        is_vulnerable_present=request_in.is_vulnerable_present,
        is_essential_unavailable=request_in.is_essential_unavailable,
        created_at=now,
        now=now,
    )

    factors_dict = [f.model_dump() for f in priority_res.factors]
    tracking_code = generate_tracking_code(db)

    new_request = AssistanceRequest(
        tracking_code=tracking_code,
        citizen_id=current_user.id if current_user else None,
        title=request_in.title.strip(),
        incident_type=request_in.incident_type.strip(),
        description=request_in.description.strip(),
        location_name=request_in.location_name.strip(),
        latitude=request_in.latitude,
        longitude=request_in.longitude,
        people_affected=request_in.people_affected,
        people_urgent=request_in.people_urgent,
        assistance_category=request_in.assistance_category.strip(),
        is_immediate_threat=request_in.is_immediate_threat,
        is_medical_emergency=request_in.is_medical_emergency,
        is_vulnerable_present=request_in.is_vulnerable_present,
        is_essential_unavailable=request_in.is_essential_unavailable,
        safe_contact_method=request_in.safe_contact_method,
        contact_details=request_in.contact_details.strip() if request_in.contact_details else None,
        accessibility_medical_notes=request_in.accessibility_medical_notes.strip() if request_in.accessibility_medical_notes else None,
        status=RequestStatus.RECEIVED,
        calculated_priority_score=priority_res.total_score,
        priority_band=priority_res.priority_band,
        priority_factors_json=json.dumps(factors_dict),
        priority_explanation=priority_res.explanation,
        priority_calculated_at=now,
        idempotency_key=request_in.idempotency_key,
        client_local_id=request_in.client_local_id,
        created_at=now,
        updated_at=now,
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Initial Status History entry
    init_history = StatusHistory(
        request_id=new_request.id,
        previous_status=None,
        new_status=RequestStatus.RECEIVED,
        changed_by_user_id=current_user.id if current_user else None,
        explanation="Request received and queued for operational triage."
    )
    db.add(init_history)
    db.commit()
    db.refresh(new_request)

    # Notify Coordinators
    notification_service.notify_new_request(
        db=db,
        request_id=new_request.id,
        tracking_code=new_request.tracking_code,
        incident_type=new_request.incident_type,
        priority_band=new_request.priority_band
    )

    return serialize_request(new_request)

@router.get("", response_model=RequestListResponse)
def list_requests(
    incident_type: Optional[str] = None,
    priority_band: Optional[str] = None,
    status: Optional[str] = None,
    assistance_category: Optional[str] = None,
    search: Optional[str] = None,
    assigned_state: Optional[str] = None,  # "assigned", "unassigned"
    is_unresolved: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    tracking_code: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(AssistanceRequest)

    # Anonymous or public search by exact tracking code
    if tracking_code:
        query = query.filter(AssistanceRequest.tracking_code == tracking_code.strip().upper())
        items = query.all()
        return RequestListResponse(
            items=[serialize_request(r) for r in items],
            total=len(items),
            page=1,
            page_size=page_size,
            total_pages=1
        )

    # Role-based restriction
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required to view requests list."
        )

    if current_user.role == UserRole.CITIZEN:
        # Citizens can only view their own requests
        query = query.filter(AssistanceRequest.citizen_id == current_user.id)
    elif current_user.role == UserRole.RESPONDER:
        # Responders view requests assigned to their team
        responder_profile = db.query(ResponderProfile).filter(ResponderProfile.user_id == current_user.id).first()
        if not responder_profile:
            return RequestListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
        query = query.join(Assignment).filter(Assignment.responder_id == responder_profile.id)

    # Apply filters
    if incident_type:
        query = query.filter(AssistanceRequest.incident_type == incident_type)
    if priority_band:
        query = query.filter(
            or_(
                AssistanceRequest.priority_override_band == priority_band,
                (AssistanceRequest.priority_override_band.is_(None) & (AssistanceRequest.priority_band == priority_band))
            )
        )
    if status:
        query = query.filter(AssistanceRequest.status == status)
    if assistance_category:
        query = query.filter(AssistanceRequest.assistance_category == assistance_category)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AssistanceRequest.title.ilike(s),
                AssistanceRequest.tracking_code.ilike(s),
                AssistanceRequest.description.ilike(s),
                AssistanceRequest.location_name.ilike(s)
            )
        )
    if assigned_state == "assigned":
        query = query.filter(AssistanceRequest.status.in_([RequestStatus.ASSIGNED, RequestStatus.EN_ROUTE, RequestStatus.ASSISTANCE_PROVIDED]))
    elif assigned_state == "unassigned":
        query = query.filter(AssistanceRequest.status.in_([RequestStatus.RECEIVED, RequestStatus.VERIFIED]))
    if is_unresolved:
        query = query.filter(~AssistanceRequest.status.in_([RequestStatus.CLOSED, RequestStatus.REJECTED, RequestStatus.CANCELLED]))

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    # Order by priority score descending and created_at descending
    items = query.order_by(
        desc(AssistanceRequest.priority_override_score),
        desc(AssistanceRequest.calculated_priority_score),
        desc(AssistanceRequest.created_at)
    ).offset(offset).limit(page_size).all()

    return RequestListResponse(
        items=[serialize_request(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{request_id}", response_model=RequestResponse)
def get_request_detail(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistance request not found.")

    if current_user and current_user.role == UserRole.CITIZEN:
        if req.citizen_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You can only view your own requests.")

    return serialize_request(req)

@router.patch("/{request_id}", response_model=RequestResponse)
def update_citizen_request(
    request_id: int,
    update_in: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    if current_user.role == UserRole.CITIZEN and req.citizen_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit requests owned by another user.")

    if update_in.safe_contact_method is not None:
        req.safe_contact_method = update_in.safe_contact_method
    if update_in.contact_details is not None:
        req.contact_details = update_in.contact_details
    if update_in.accessibility_medical_notes is not None:
        req.accessibility_medical_notes = update_in.accessibility_medical_notes

    req.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(req)
    return serialize_request(req)

@router.post("/{request_id}/verify", response_model=RequestResponse)
def verify_request(
    request_id: int,
    verify_in: RequestVerify,
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    old_status = req.status
    valid, err = status_workflow_service.is_transition_valid(
        current_status=old_status,
        new_status=RequestStatus.VERIFIED,
        role=coordinator.role
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    req.status = RequestStatus.VERIFIED
    req.verification_notes = verify_in.verification_notes
    req.verified_by_user_id = coordinator.id
    req.verified_at = datetime.datetime.utcnow()
    req.updated_at = datetime.datetime.utcnow()

    # Status History
    status_hist = StatusHistory(
        request_id=req.id,
        previous_status=old_status,
        new_status=RequestStatus.VERIFIED,
        changed_by_user_id=coordinator.id,
        explanation=verify_in.verification_notes or "Verified by coordinator triage desk."
    )
    db.add(status_hist)
    db.commit()
    db.refresh(req)

    audit_service.log_action(
        db=db,
        action="REQUEST_VERIFIED",
        entity_type="AssistanceRequest",
        entity_id=req.id,
        user_id=coordinator.id,
        details={"verification_notes": verify_in.verification_notes}
    )

    notification_service.notify_status_change(
        db=db,
        request_id=req.id,
        tracking_code=req.tracking_code,
        new_status=RequestStatus.VERIFIED,
        citizen_user_id=req.citizen_id
    )

    return serialize_request(req)

@router.post("/{request_id}/priority-override", response_model=RequestResponse)
def priority_override(
    request_id: int,
    override_in: PriorityOverrideRequest,
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    old_score = req.effective_priority_score
    old_band = req.effective_priority_band

    req.priority_override_score = override_in.override_score
    req.priority_override_band = override_in.override_band
    req.priority_override_reason = override_in.reason
    req.priority_override_by_user_id = coordinator.id
    req.priority_override_at = datetime.datetime.utcnow()
    req.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(req)

    audit_service.log_action(
        db=db,
        action="PRIORITY_OVERRIDE",
        entity_type="AssistanceRequest",
        entity_id=req.id,
        user_id=coordinator.id,
        details={
            "old_score": old_score,
            "old_band": old_band,
            "new_score": override_in.override_score,
            "new_band": override_in.override_band,
            "reason": override_in.reason,
        }
    )

    return serialize_request(req)

@router.post("/{request_id}/assign", response_model=RequestResponse)
def assign_request(
    request_id: int,
    assign_in: AssignRequest,
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    responder = db.query(ResponderProfile).filter(ResponderProfile.id == assign_in.responder_id).first()
    if not responder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Responder unit not found.")

    success, msg, _ = assignment_service.assign_responder(
        db=db,
        request=req,
        responder=responder,
        coordinator_user_id=coordinator.id,
        override_workload_reason=assign_in.override_workload_reason
    )

    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    db.refresh(req)
    return serialize_request(req)

@router.post("/{request_id}/status", response_model=RequestResponse)
def update_request_status(
    request_id: int,
    status_in: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    # 1. Ownership & Role Validation
    if current_user.role == UserRole.CITIZEN:
        if req.citizen_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel or modify another citizen's request.")

    elif current_user.role == UserRole.RESPONDER:
        profile = db.query(ResponderProfile).filter(ResponderProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No responder profile associated with current user.")
        
        # Verify responder has an active assignment for this request
        assignment = db.query(Assignment).filter(
            Assignment.request_id == req.id,
            Assignment.responder_id == profile.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Responders can only update requests actively assigned to their unit."
            )

    elif current_user.role != UserRole.COORDINATOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{current_user.role}' is not authorized to update incident statuses.")

    # 2. Extract previous note to prevent duplicate explanation reuse
    latest_hist = db.query(StatusHistory).filter(
        StatusHistory.request_id == req.id
    ).order_by(StatusHistory.id.desc()).first()
    previous_note = latest_hist.explanation if latest_hist else None

    # 3. Transition Validation via StatusWorkflowService
    valid, err = status_workflow_service.validate_transition(
        current_status=req.status,
        new_status=status_in.new_status,
        role=current_user.role,
        is_override=status_in.is_override,
        explanation=status_in.explanation,
        assistance_confirmed=status_in.assistance_confirmed,
        assistance_notes=status_in.assistance_notes,
        closure_explanation=status_in.closure_explanation,
        override_reason=status_in.override_reason,
        previous_note=previous_note,
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    # 4. Formulate specific, non-duplicated transition explanation
    if status_in.is_override:
        reason_text = (status_in.override_reason or status_in.explanation or "").strip()
        explanation_to_record = f"Administrative override to {status_in.new_status}: {reason_text}"
    elif status_in.new_status == RequestStatus.ASSISTANCE_PROVIDED:
        note_text = (status_in.assistance_notes or status_in.explanation or "").strip()
        explanation_to_record = f"Assistance confirmed provided: {note_text}"
    elif status_in.new_status == RequestStatus.CLOSED:
        note_text = (status_in.closure_explanation or status_in.explanation or "").strip()
        explanation_to_record = f"Incident closed: {note_text}"
    else:
        explanation_to_record = (status_in.explanation or "").strip() or f"Status transitioned from {req.status} to {status_in.new_status}"

    now = datetime.datetime.utcnow()
    old_status = req.status
    req.status = status_in.new_status
    req.updated_at = now

    # 5. Synchronize active assignments if moving to EN_ROUTE or ASSISTANCE_PROVIDED
    if status_in.new_status == RequestStatus.EN_ROUTE:
        assigned_records = db.query(Assignment).filter(
            Assignment.request_id == req.id,
            Assignment.status == AssignmentStatus.ASSIGNED
        ).all()
        for a in assigned_records:
            a.status = AssignmentStatus.ACCEPTED
            a.accepted_at = now
    elif status_in.new_status == RequestStatus.ASSISTANCE_PROVIDED:
        active_records = db.query(Assignment).filter(
            Assignment.request_id == req.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
        ).all()
        for a in active_records:
            a.status = AssignmentStatus.COMPLETED
            a.completed_at = now
            a.assistance_notes = (status_in.assistance_notes or status_in.explanation or "").strip()
            # Recalculate responder workload
            if a.responder:
                active_count = db.query(Assignment).filter(
                    Assignment.responder_id == a.responder.id,
                    Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]),
                    Assignment.id != a.id
                ).count()
                a.responder.current_assignment_count = active_count
                if active_count < a.responder.max_concurrent_assignments and a.responder.availability == ResponderAvailability.BUSY:
                    a.responder.availability = ResponderAvailability.AVAILABLE
    elif status_in.new_status == RequestStatus.CLOSED:
        active_records = db.query(Assignment).filter(
            Assignment.request_id == req.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
        ).all()
        for a in active_records:
            a.status = AssignmentStatus.COMPLETED
            if not a.completed_at:
                a.completed_at = now
            if not a.assistance_notes:
                a.assistance_notes = (status_in.closure_explanation or status_in.explanation or "").strip()
            if a.responder:
                active_count = db.query(Assignment).filter(
                    Assignment.responder_id == a.responder.id,
                    Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]),
                    Assignment.id != a.id
                ).count()
                a.responder.current_assignment_count = active_count
                if active_count < a.responder.max_concurrent_assignments and a.responder.availability == ResponderAvailability.BUSY:
                    a.responder.availability = ResponderAvailability.AVAILABLE
    elif status_in.new_status in [RequestStatus.CANCELLED, RequestStatus.REJECTED]:
        active_records = db.query(Assignment).filter(
            Assignment.request_id == req.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
        ).all()
        for a in active_records:
            a.status = AssignmentStatus.CANCELLED
            if a.responder:
                active_count = db.query(Assignment).filter(
                    Assignment.responder_id == a.responder.id,
                    Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]),
                    Assignment.id != a.id
                ).count()
                a.responder.current_assignment_count = active_count
                if active_count < a.responder.max_concurrent_assignments and a.responder.availability == ResponderAvailability.BUSY:
                    a.responder.availability = ResponderAvailability.AVAILABLE

    # 6. Status History
    status_hist = StatusHistory(
        request_id=req.id,
        previous_status=old_status,
        new_status=status_in.new_status,
        changed_by_user_id=current_user.id,
        explanation=explanation_to_record,
        timestamp=now
    )
    db.add(status_hist)
    db.commit()
    db.refresh(req)

    # 7. Audit log (Overrides and significant transitions)
    if status_in.is_override:
        audit_service.log_action(
            db=db,
            action="STATUS_OVERRIDE",
            entity_type="AssistanceRequest",
            entity_id=req.id,
            user_id=current_user.id,
            details={
                "actor": current_user.full_name or current_user.email,
                "actor_id": current_user.id,
                "actor_role": current_user.role,
                "previous_status": old_status,
                "new_status": status_in.new_status,
                "reason": status_in.override_reason or status_in.explanation,
                "timestamp": now.isoformat(),
                "is_override": True,
            }
        )
    elif status_in.new_status in [RequestStatus.CLOSED, RequestStatus.REJECTED, RequestStatus.CANCELLED, RequestStatus.ASSISTANCE_PROVIDED]:
        audit_service.log_action(
            db=db,
            action=f"STATUS_{status_in.new_status}",
            entity_type="AssistanceRequest",
            entity_id=req.id,
            user_id=current_user.id,
            details={
                "actor": current_user.full_name or current_user.email,
                "actor_id": current_user.id,
                "actor_role": current_user.role,
                "previous_status": old_status,
                "new_status": status_in.new_status,
                "explanation": explanation_to_record,
                "timestamp": now.isoformat(),
                "is_override": False,
            }
        )

    # 8. Notify Citizen
    notification_service.notify_status_change(
        db=db,
        request_id=req.id,
        tracking_code=req.tracking_code,
        new_status=status_in.new_status,
        citizen_user_id=req.citizen_id
    )

    return serialize_request(req)

@router.get("/{request_id}/history", response_model=List[StatusHistoryResponse])
def get_request_history(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    if current_user and current_user.role == UserRole.CITIZEN and req.citizen_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    history_items = []
    for h in req.status_history:
        changed_by_name = h.changed_by.full_name if h.changed_by else "System"
        history_items.append(StatusHistoryResponse(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            changed_by_name=changed_by_name,
            explanation=h.explanation,
            timestamp=h.timestamp
        ))
    return history_items
