from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.request import AssistanceRequest, RequestStatus
from app.models.responder import ResponderProfile, ResponderAvailability
from app.models.assignment import Assignment, AssignmentStatus
from app.models.status_history import StatusHistory
from app.services.notification_service import notification_service
from app.services.audit_service import audit_service

class AssignmentService:
    @staticmethod
    def assign_responder(
        db: Session,
        request: AssistanceRequest,
        responder: ResponderProfile,
        coordinator_user_id: int,
        override_workload_reason: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Assignment]]:
        # 1. Check availability
        if responder.availability == ResponderAvailability.OFF_DUTY:
            if not override_workload_reason:
                return False, f"Responder '{responder.team}' is currently OFF_DUTY. An override reason is required to force assignment.", None

        # 2. Check capacity
        # Count actual active assignments
        active_count = db.query(Assignment).join(AssistanceRequest, Assignment.request_id == AssistanceRequest.id).filter(
            Assignment.responder_id == responder.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]),
            AssistanceRequest.status.notin_([RequestStatus.CLOSED, RequestStatus.CANCELLED, RequestStatus.REJECTED])
        ).count()

        if active_count >= responder.max_concurrent_assignments:
            if not override_workload_reason:
                return False, (
                    f"Responder '{responder.team}' has reached max capacity "
                    f"({active_count}/{responder.max_concurrent_assignments}). "
                    f"An override reason is required to assign."
                ), None

        # 3. Check if this request is already assigned to this responder
        existing = db.query(Assignment).filter(
            Assignment.request_id == request.id,
            Assignment.responder_id == responder.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
        ).first()
        if existing:
            return False, f"Request is already actively assigned to unit '{responder.team}'.", None

        # 4. If request had another active assignment, mark it reassigned
        active_existing = db.query(Assignment).filter(
            Assignment.request_id == request.id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS])
        ).all()
        for prev in active_existing:
            prev.status = AssignmentStatus.REASSIGNED

        # 5. Create new assignment
        new_assignment = Assignment(
            request_id=request.id,
            responder_id=responder.id,
            assigned_by_user_id=coordinator_user_id,
            status=AssignmentStatus.ASSIGNED,
            override_workload_reason=override_workload_reason,
        )
        db.add(new_assignment)

        # 6. Update request status to ASSIGNED if not already
        old_status = request.status
        request.status = RequestStatus.ASSIGNED
        
        status_hist = StatusHistory(
            request_id=request.id,
            previous_status=old_status,
            new_status=RequestStatus.ASSIGNED,
            changed_by_user_id=coordinator_user_id,
            explanation=f"Assigned to {responder.team}." + (f" Override: {override_workload_reason}" if override_workload_reason else "")
        )
        db.add(status_hist)

        # 7. Update responder workload count
        responder.current_assignment_count = active_count + 1
        if responder.current_assignment_count >= responder.max_concurrent_assignments:
            responder.availability = ResponderAvailability.BUSY

        db.commit()
        db.refresh(new_assignment)

        # 8. Notifications & Audit
        notification_service.notify_assignment(
            db=db,
            responder_user_id=responder.user_id,
            request_id=request.id,
            tracking_code=request.tracking_code,
            team_name=responder.team
        )
        audit_service.log_action(
            db=db,
            action="ASSIGNMENT_CREATED",
            entity_type="Assignment",
            entity_id=new_assignment.id,
            user_id=coordinator_user_id,
            details={
                "request_id": request.id,
                "tracking_code": request.tracking_code,
                "responder_id": responder.id,
                "team": responder.team,
                "override_workload_reason": override_workload_reason
            }
        )

        return True, "Assignment successfully created.", new_assignment

assignment_service = AssignmentService()
