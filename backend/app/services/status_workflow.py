from typing import Dict, Set, Optional, Tuple
from app.models.request import RequestStatus
from app.models.user import UserRole

# Standard permissible forward progression
STANDARD_TRANSITIONS: Dict[str, Set[str]] = {
    RequestStatus.RECEIVED: {RequestStatus.VERIFIED, RequestStatus.REJECTED, RequestStatus.CANCELLED},
    RequestStatus.VERIFIED: {RequestStatus.ASSIGNED, RequestStatus.REJECTED, RequestStatus.CANCELLED},
    RequestStatus.ASSIGNED: {RequestStatus.EN_ROUTE, RequestStatus.CANCELLED, RequestStatus.VERIFIED},  # If reassigned/unassigned
    RequestStatus.EN_ROUTE: {RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.ASSIGNED},  # If recalled
    RequestStatus.ASSISTANCE_PROVIDED: {RequestStatus.CLOSED},
    RequestStatus.CLOSED: set(),
    RequestStatus.REJECTED: set(),
    RequestStatus.CANCELLED: set(),
}

class StatusWorkflowService:
    @staticmethod
    def validate_transition(
        current_status: str,
        new_status: str,
        role: str,
        is_override: bool = False,
        explanation: Optional[str] = None,
        assistance_confirmed: Optional[bool] = False,
        assistance_notes: Optional[str] = None,
        closure_explanation: Optional[str] = None,
        override_reason: Optional[str] = None,
        previous_note: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate whether a status transition is permitted, verifying state machine rules,
        role authorizations, explicit confirmations, and required meaningful notes.
        """
        if current_status == new_status:
            return False, f"Request is already in status '{current_status}'."

        if new_status not in RequestStatus.ALL:
            return False, f"Target status '{new_status}' is not a recognized system status."

        # 1. Administrative Override Validation
        if is_override:
            if role != UserRole.COORDINATOR:
                return False, "Only authorized Coordinators can perform administrative status overrides."
            
            reason = (override_reason or explanation or "").strip()
            if len(reason) < 10:
                return False, "A meaningful explanation reason (at least 10 characters) is required for administrative status overrides."

            # Even on override, assistance cannot be fabricated without explicit confirmation and notes
            if new_status == RequestStatus.ASSISTANCE_PROVIDED:
                if not assistance_confirmed:
                    return False, "Explicit confirmation that assistance was provided is required before transitioning to ASSISTANCE_PROVIDED."
                comp_note = (assistance_notes or explanation or "").strip()
                if len(comp_note) < 10:
                    return False, "A meaningful assistance completion note (at least 10 characters) is required."
                if previous_note and comp_note.lower() == previous_note.strip().lower():
                    return False, "Assistance completion note cannot be identical to the previous status note."

            # Even on override, closing an incident requires a meaningful closure explanation
            if new_status == RequestStatus.CLOSED:
                close_note = (closure_explanation or override_reason or explanation or "").strip()
                if len(close_note) < 10:
                    return False, "A meaningful closure explanation (at least 10 characters) is required before closing an incident."

            return True, None

        # 2. Citizen Role Constraints
        if role == UserRole.CITIZEN:
            if new_status == RequestStatus.CANCELLED:
                if current_status in {RequestStatus.RECEIVED, RequestStatus.VERIFIED}:
                    return True, None
                return False, f"Citizen cannot cancel request once in '{current_status}' status. Please contact emergency coordinator."
            return False, f"Citizens cannot perform transition to '{new_status}'."

        # 3. Responder Role Constraints
        if role == UserRole.RESPONDER:
            if current_status == RequestStatus.ASSIGNED and new_status == RequestStatus.EN_ROUTE:
                return True, None
            
            if current_status == RequestStatus.EN_ROUTE and new_status == RequestStatus.ASSISTANCE_PROVIDED:
                if not assistance_confirmed:
                    return False, "Explicit confirmation that assistance was provided is required before transitioning to ASSISTANCE_PROVIDED."
                comp_note = (assistance_notes or explanation or "").strip()
                if len(comp_note) < 10:
                    return False, "A meaningful assistance completion note (at least 10 characters) is required."
                if previous_note and comp_note.lower() == previous_note.strip().lower():
                    return False, "Assistance completion note cannot be identical to the previous status note."
                return True, None

            return False, (
                f"Responders cannot transition request from '{current_status}' to '{new_status}'. "
                "Permitted field transitions: ASSIGNED -> EN_ROUTE, EN_ROUTE -> ASSISTANCE_PROVIDED."
            )

        # 4. Coordinator Role Constraints (Standard Sequential Progression)
        if role == UserRole.COORDINATOR:
            allowed = STANDARD_TRANSITIONS.get(current_status, set())
            if new_status not in allowed:
                return False, (
                    f"Invalid coordinator transition from '{current_status}' to '{new_status}'. "
                    "Standard workflow must be followed or marked as administrative override with documented explanation."
                )

            # Transitioning to ASSISTANCE_PROVIDED requires explicit confirmation and distinct meaningful notes
            if new_status == RequestStatus.ASSISTANCE_PROVIDED:
                if not assistance_confirmed:
                    return False, "Explicit confirmation that assistance was provided is required before transitioning to ASSISTANCE_PROVIDED."
                comp_note = (assistance_notes or explanation or "").strip()
                if len(comp_note) < 10:
                    return False, "A meaningful assistance completion note (at least 10 characters) is required."
                if previous_note and comp_note.lower() == previous_note.strip().lower():
                    return False, "Assistance completion note cannot be identical to the previous status note."

            # Transitioning to CLOSED requires assistance to have been provided and a meaningful closure explanation
            if new_status == RequestStatus.CLOSED:
                if current_status not in {RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.REJECTED, RequestStatus.CANCELLED}:
                    return False, (
                        f"Cannot close incident from status '{current_status}'. "
                        "Workflow requirements require assistance to be provided before closing, or an authorized administrative override."
                    )
                close_note = (closure_explanation or explanation or "").strip()
                if len(close_note) < 10:
                    return False, "A meaningful closure explanation (at least 10 characters) is required before closing an incident."
                if previous_note and close_note.lower() == previous_note.strip().lower():
                    return False, "Closure explanation cannot be identical to the previous status note."

            # Rejections and cancellations require a reason
            if new_status in {RequestStatus.REJECTED, RequestStatus.CANCELLED}:
                rej_note = (explanation or "").strip()
                if len(rej_note) < 5:
                    return False, f"A meaningful explanation reason (at least 5 characters) is required when marking an incident as {new_status}."

            return True, None

        return False, f"Role '{role}' is not authorized to transition request statuses."

    @staticmethod
    def is_transition_valid(
        current_status: str,
        new_status: str,
        role: str,
        is_override: bool = False,
        explanation: Optional[str] = None,
        assistance_confirmed: Optional[bool] = False,
        assistance_notes: Optional[str] = None,
        closure_explanation: Optional[str] = None,
        override_reason: Optional[str] = None,
        previous_note: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Convenience alias for validate_transition preserving backward compatibility."""
        return StatusWorkflowService.validate_transition(
            current_status=current_status,
            new_status=new_status,
            role=role,
            is_override=is_override,
            explanation=explanation,
            assistance_confirmed=assistance_confirmed,
            assistance_notes=assistance_notes,
            closure_explanation=closure_explanation,
            override_reason=override_reason,
            previous_note=previous_note,
        )

status_workflow_service = StatusWorkflowService()
