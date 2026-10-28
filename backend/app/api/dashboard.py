import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.request import AssistanceRequest, RequestStatus, PriorityBand
from app.models.responder import ResponderProfile, ResponderAvailability
from app.models.assignment import Assignment
from app.models.status_history import StatusHistory
from app.models.audit_log import AuditLog
from app.schemas.dashboard import (
    DashboardSummary, DashboardAnalytics, StatusDistribution,
    IncidentTypeDistribution, PriorityDistribution, ActivityItem
)
from app.api.deps import require_coordinator

router = APIRouter(prefix="/dashboard", tags=["Operational Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    # Total active requests (not terminal states)
    total_active = db.query(AssistanceRequest).filter(
        ~AssistanceRequest.status.in_([RequestStatus.CLOSED, RequestStatus.REJECTED, RequestStatus.CANCELLED])
    ).count()

    # Critical requests awaiting review
    critical_awaiting = db.query(AssistanceRequest).filter(
        AssistanceRequest.status == RequestStatus.RECEIVED,
        or_(
            AssistanceRequest.priority_override_band == PriorityBand.CRITICAL,
            (AssistanceRequest.priority_override_band.is_(None) & (AssistanceRequest.priority_band == PriorityBand.CRITICAL))
        )
    ).count()

    # Unassigned requests
    unassigned = db.query(AssistanceRequest).filter(
        AssistanceRequest.status.in_([RequestStatus.RECEIVED, RequestStatus.VERIFIED])
    ).count()

    # Responders currently available
    responders_avail = db.query(ResponderProfile).filter(
        ResponderProfile.availability == ResponderAvailability.AVAILABLE
    ).count()

    # Assistance provided
    provided = db.query(AssistanceRequest).filter(
        AssistanceRequest.status.in_([RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.CLOSED])
    ).count()

    # Awaiting verification
    awaiting_verify = db.query(AssistanceRequest).filter(
        AssistanceRequest.status == RequestStatus.RECEIVED
    ).count()

    return DashboardSummary(
        total_active_requests=total_active,
        critical_awaiting_review=critical_awaiting,
        unassigned_requests=unassigned,
        responders_available=responders_avail,
        assistance_provided=provided,
        awaiting_verification=awaiting_verify,
        is_live_data=True
    )

@router.get("/analytics", response_model=DashboardAnalytics)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    total = db.query(AssistanceRequest).count()

    # Status distribution
    status_counts = db.query(
        AssistanceRequest.status, func.count(AssistanceRequest.id)
    ).group_by(AssistanceRequest.status).all()
    status_dist = [StatusDistribution(status=s, count=c) for s, c in status_counts]

    # Incident type distribution
    type_counts = db.query(
        AssistanceRequest.incident_type, func.count(AssistanceRequest.id)
    ).group_by(AssistanceRequest.incident_type).all()
    type_dist = [IncidentTypeDistribution(incident_type=t, count=c) for t, c in type_counts]

    # Priority distribution (using effective priority band)
    priority_counts = db.query(
        func.coalesce(AssistanceRequest.priority_override_band, AssistanceRequest.priority_band).label("band"),
        func.count(AssistanceRequest.id)
    ).group_by("band").all()
    prio_dist = [PriorityDistribution(priority_band=b or "LOW", count=c) for b, c in priority_counts]

    return DashboardAnalytics(
        status_distribution=status_dist,
        incident_type_distribution=type_dist,
        priority_distribution=prio_dist,
        total_requests=total
    )

@router.get("/activity", response_model=List[ActivityItem])
def get_dashboard_activity(
    limit: int = 25,
    db: Session = Depends(get_db),
    coordinator: User = Depends(require_coordinator)
):
    # Retrieve recent status history entries
    histories = db.query(StatusHistory).order_by(
        desc(StatusHistory.timestamp)
    ).limit(limit).all()

    items = []
    for h in histories:
        req = h.request
        actor = h.changed_by.full_name if h.changed_by else "System"
        items.append(ActivityItem(
            id=h.id,
            timestamp=h.timestamp,
            action_type=f"STATUS_{h.new_status}",
            actor_name=actor,
            description=h.explanation or f"Status shifted to {h.new_status}",
            entity_id=h.request_id,
            tracking_code=req.tracking_code if req else None
        ))
    return items
