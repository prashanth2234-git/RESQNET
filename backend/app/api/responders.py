import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.responder import ResponderProfile, ResponderAvailability
from app.models.assignment import Assignment, AssignmentStatus
from app.models.request import AssistanceRequest, RequestStatus
from app.models.status_history import StatusHistory
from app.schemas.responder import ResponderCreate, ResponderUpdateAvailability, ResponderResponse
from app.schemas.assignment import AssignmentDetailedResponse, AssignmentCompleteRequest
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.status_workflow import status_workflow_service
from app.api.deps import get_current_user, require_coordinator, require_responder

router = APIRouter(prefix="", tags=["Responders & Assignments"])

def serialize_responder(profile: ResponderProfile) -> ResponderResponse:
    categories = []
    if profile.supported_categories:
        try:
            categories = json.loads(profile.supported_categories)
        except Exception:
            categories = [c.strip() for c in profile.supported_categories.split(",") if c.strip()]
            
    return ResponderResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.user.full_name if profile.user else "Unknown Responder",
        email=profile.user.email if profile.user else "",
        phone=profile.user.phone if profile.user else None,
        team=profile.team,
        supported_categories=categories,
        availability=profile.availability,
        max_concurrent_assignments=profile.max_concurrent_assignments,
        current_assignment_count=profile.current_assignment_count,
        latitude=profile.latitude,
        longitude=profile.longitude,
        last_active_at=profile.last_active_at,
        created_at=profile.created_at
    )

def serialize_assignment(a: Assignment) -> AssignmentDetailedResponse:
    req = a.request
    return AssignmentDetailedResponse(
        id=a.id,
        request_id=a.request_id,
        request_tracking_code=req.tracking_code,
        request_title=req.title,
        request_incident_type=req.incident_type,
        request_location_name=req.location_name,
        request_latitude=req.latitude,
        request_longitude=req.longitude,
        request_priority_band=req.effective_priority_band,
        request_priority_score=req.effective_priority_score,
        request_safe_contact_method=req.safe_contact_method,
        request_contact_details=req.contact_details,
        request_status=req.status,
        responder_id=a.responder_id,
        responder_team=a.responder.team if a.responder else "Unknown Unit",
        status=a.status,
        assigned_at=a.assigned_at,
        accepted_at=a.accepted_at,
        completed_at=a.completed_at,
        assistance_notes=a.assistance_notes,
        override_workload_reason=a.override_workload_reason
    )

@router.get("/responders", response_model=List[ResponderResponse])
def get_responders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Coordinators and Responders can view responder directory
    profiles = db.query(ResponderProfile).all()
    # Recalculate dynamic active count for accuracy
    for p in profiles:
        active_count = db.query(Assignment).join(AssistanceRequest, Assignment.request_id == AssistanceRequest.id).filter(
            Assignment.responder_id == p.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]),
            AssistanceRequest.status.notin_([RequestStatus.CLOSED, RequestStatus.CANCELLED, RequestStatus.REJECTED])
        ).count()
        p.current_assignment_count = active_count
    db.commit()

    return [serialize_responder(p) for p in profiles]

@router.post("/responders", response_model=ResponderResponse, status_code=status.HTTP_201_CREATED)
def create_responder(
    resp_in: ResponderCreate,
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    target_user = db.query(User).filter(User.id == resp_in.user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")

    existing = db.query(ResponderProfile).filter(ResponderProfile.user_id == target_user.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Responder profile already exists for this user.")

    # Ensure user has RESPONDER role
    target_user.role = UserRole.RESPONDER

    profile = ResponderProfile(
        user_id=target_user.id,
        team=resp_in.team,
        supported_categories=json.dumps(resp_in.supported_categories),
        max_concurrent_assignments=resp_in.max_concurrent_assignments,
        availability=ResponderAvailability.AVAILABLE,
        latitude=resp_in.latitude,
        longitude=resp_in.longitude
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    audit_service.log_action(
        db=db,
        action="RESPONDER_CREATED",
        entity_type="ResponderProfile",
        entity_id=profile.id,
        user_id=coordinator.id,
        details={"team": resp_in.team, "max": resp_in.max_concurrent_assignments}
    )

    return serialize_responder(profile)

@router.get("/responders/me/assignments", response_model=List[AssignmentDetailedResponse])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_responder)
):
    profile = db.query(ResponderProfile).filter(ResponderProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Responder profile not found.")

    assignments = db.query(Assignment).filter(
        Assignment.responder_id == profile.id
    ).order_by(Assignment.assigned_at.desc()).all()

    return [serialize_assignment(a) for a in assignments]

@router.patch("/responders/me/availability", response_model=ResponderResponse)
def update_my_availability(
    avail_in: ResponderUpdateAvailability,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_responder)
):
    profile = db.query(ResponderProfile).filter(ResponderProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Responder profile not found.")

    profile.availability = avail_in.availability
    profile.last_active_at = datetime.datetime.utcnow()
    profile.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(profile)

    return serialize_responder(profile)

@router.post("/assignments/{assignment_id}/accept", response_model=AssignmentDetailedResponse)
def accept_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_responder)
):
    profile = db.query(ResponderProfile).filter(ResponderProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Responder profile not found.")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.responder_id != profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot accept an assignment designated for another team.")

    if assignment.status != AssignmentStatus.ASSIGNED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Assignment is already in '{assignment.status}' state.")

    req = assignment.request
    old_req_status = req.status

    # Validate transition via workflow service
    valid, err = status_workflow_service.validate_transition(
        current_status=old_req_status,
        new_status=RequestStatus.EN_ROUTE,
        role=current_user.role
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    now = datetime.datetime.utcnow()
    assignment.status = AssignmentStatus.ACCEPTED
    assignment.accepted_at = now
    
    # Transition request to EN_ROUTE
    req.status = RequestStatus.EN_ROUTE
    req.updated_at = now

    status_hist = StatusHistory(
        request_id=req.id,
        previous_status=old_req_status,
        new_status=RequestStatus.EN_ROUTE,
        changed_by_user_id=current_user.id,
        explanation=f"Responder unit '{profile.team}' accepted assignment and is en route."
    )
    db.add(status_hist)
    db.commit()
    db.refresh(assignment)

    notification_service.notify_status_change(
        db=db,
        request_id=req.id,
        tracking_code=req.tracking_code,
        new_status=RequestStatus.EN_ROUTE,
        citizen_user_id=req.citizen_id
    )

    return serialize_assignment(assignment)

@router.post("/assignments/{assignment_id}/complete", response_model=AssignmentDetailedResponse)
def complete_assignment(
    assignment_id: int,
    complete_in: AssignmentCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_responder)
):
    profile = db.query(ResponderProfile).filter(ResponderProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Responder profile not found.")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.responder_id != profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot complete an assignment designated for another team.")

    req = assignment.request
    old_status = req.status

    latest_hist = db.query(StatusHistory).filter(
        StatusHistory.request_id == req.id
    ).order_by(StatusHistory.id.desc()).first()
    previous_note = latest_hist.explanation if latest_hist else None

    # Validate transition via workflow service
    valid, err = status_workflow_service.validate_transition(
        current_status=old_status,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=current_user.role,
        assistance_confirmed=True,
        assistance_notes=complete_in.assistance_notes,
        previous_note=previous_note
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    now = datetime.datetime.utcnow()
    assignment.status = AssignmentStatus.COMPLETED
    assignment.completed_at = now
    assignment.assistance_notes = complete_in.assistance_notes

    # Update request status to ASSISTANCE_PROVIDED
    req.status = RequestStatus.ASSISTANCE_PROVIDED
    req.updated_at = now

    status_hist = StatusHistory(
        request_id=req.id,
        previous_status=old_status,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        changed_by_user_id=current_user.id,
        explanation=f"Assistance provided by {profile.team}. Notes: {complete_in.assistance_notes}"
    )
    db.add(status_hist)

    # Recalculate responder active assignments
    active_count = db.query(Assignment).filter(
        Assignment.responder_id == profile.id,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
    ).count()
    profile.current_assignment_count = active_count
    if active_count < profile.max_concurrent_assignments and profile.availability == ResponderAvailability.BUSY:
        profile.availability = ResponderAvailability.AVAILABLE

    db.commit()
    db.refresh(assignment)

    audit_service.log_action(
        db=db,
        action="ASSISTANCE_PROVIDED",
        entity_type="Assignment",
        entity_id=assignment.id,
        user_id=current_user.id,
        details={"notes": complete_in.assistance_notes}
    )

    notification_service.notify_status_change(
        db=db,
        request_id=req.id,
        tracking_code=req.tracking_code,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        citizen_user_id=req.citizen_id
    )

    return serialize_assignment(assignment)
