import pytest
from app.models.request import RequestStatus
from app.models.user import UserRole
from app.services.status_workflow import status_workflow_service

# 1. Valid Transitions
def test_valid_coordinator_forward_workflow():
    # RECEIVED -> VERIFIED
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status=RequestStatus.VERIFIED,
        role=UserRole.COORDINATOR
    )
    assert valid is True
    assert err is None

    # VERIFIED -> ASSIGNED
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.VERIFIED,
        new_status=RequestStatus.ASSIGNED,
        role=UserRole.COORDINATOR
    )
    assert valid is True
    assert err is None

    # ASSIGNED -> EN_ROUTE
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSIGNED,
        new_status=RequestStatus.EN_ROUTE,
        role=UserRole.COORDINATOR
    )
    assert valid is True
    assert err is None

    # EN_ROUTE -> ASSISTANCE_PROVIDED (with explicit confirmation and completion note)
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=UserRole.COORDINATOR,
        assistance_confirmed=True,
        assistance_notes="Emergency supplies and medical aid delivered to family."
    )
    assert valid is True
    assert err is None

    # ASSISTANCE_PROVIDED -> CLOSED (with closure explanation)
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSISTANCE_PROVIDED,
        new_status=RequestStatus.CLOSED,
        role=UserRole.COORDINATOR,
        closure_explanation="All family members accounted for and transferred to shelter."
    )
    assert valid is True
    assert err is None

# 2. Invalid Transitions
def test_invalid_transitions():
    # Skipping straight from RECEIVED to CLOSED without override
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status=RequestStatus.CLOSED,
        role=UserRole.COORDINATOR,
        closure_explanation="Premature close attempt"
    )
    assert valid is False
    assert "Invalid coordinator transition" in err

    # Cannot transition to self
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.VERIFIED,
        new_status=RequestStatus.VERIFIED,
        role=UserRole.COORDINATOR
    )
    assert valid is False
    assert "already in status" in err

    # Cannot close directly from EN_ROUTE without assistance provided
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.CLOSED,
        role=UserRole.COORDINATOR,
        closure_explanation="Trying to close while en route"
    )
    assert valid is False
    assert "Invalid coordinator transition" in err

    # Non-existent status
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status="FLYING_AWAY",
        role=UserRole.COORDINATOR
    )
    assert valid is False
    assert "not a recognized system status" in err

# 3. Missing or Duplicate Completion Notes
def test_assistance_completion_validation():
    # Missing confirmation
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=UserRole.COORDINATOR,
        assistance_confirmed=False,
        assistance_notes="Assistance was provided properly"
    )
    assert valid is False
    assert "Explicit confirmation" in err

    # Missing completion notes (< 10 chars)
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=UserRole.COORDINATOR,
        assistance_confirmed=True,
        assistance_notes="Done"
    )
    assert valid is False
    assert "at least 10 characters" in err

    # Reusing previous note from EN_ROUTE
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=UserRole.COORDINATOR,
        assistance_confirmed=True,
        assistance_notes="Responder unit is proceeding to scene",
        previous_note="Responder unit is proceeding to scene"
    )
    assert valid is False
    assert "cannot be identical to the previous status note" in err

# 4. Missing or Invalid Closure Explanations
def test_closure_explanation_validation():
    # Missing closure explanation
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSISTANCE_PROVIDED,
        new_status=RequestStatus.CLOSED,
        role=UserRole.COORDINATOR,
        closure_explanation=None
    )
    assert valid is False
    assert "closure explanation (at least 10 characters) is required" in err

    # Short closure explanation (< 10 chars)
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSISTANCE_PROVIDED,
        new_status=RequestStatus.CLOSED,
        role=UserRole.COORDINATOR,
        closure_explanation="Closed."
    )
    assert valid is False
    assert "at least 10 characters" in err

    # Duplicate explanation matching previous note
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSISTANCE_PROVIDED,
        new_status=RequestStatus.CLOSED,
        role=UserRole.COORDINATOR,
        closure_explanation="All supplies handed over",
        previous_note="All supplies handed over"
    )
    assert valid is False
    assert "cannot be identical to the previous status note" in err

# 5. Administrative Overrides
def test_administrative_overrides():
    # Override by Responder is forbidden
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.CLOSED,
        new_status=RequestStatus.ASSIGNED,
        role=UserRole.RESPONDER,
        is_override=True,
        override_reason="Need to reopen this right now"
    )
    assert valid is False
    assert "Only authorized Coordinators" in err

    # Override without meaningful reason (< 10 chars)
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.CLOSED,
        new_status=RequestStatus.ASSIGNED,
        role=UserRole.COORDINATOR,
        is_override=True,
        override_reason="Reopen"
    )
    assert valid is False
    assert "at least 10 characters" in err

    # Override directly to ASSISTANCE_PROVIDED still requires explicit confirmation
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=UserRole.COORDINATOR,
        is_override=True,
        override_reason="Direct override due to immediate telephone confirmation",
        assistance_confirmed=False
    )
    assert valid is False
    assert "Explicit confirmation that assistance was provided is required" in err

    # Valid coordinator administrative override with documented explanation
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.CLOSED,
        new_status=RequestStatus.ASSIGNED,
        role=UserRole.COORDINATOR,
        is_override=True,
        override_reason="Authorized coordinator reopening after secondary inspection call"
    )
    assert valid is True
    assert err is None

# 6. Role Permissions
def test_role_permissions_separation():
    # Responder can accept assignment: ASSIGNED -> EN_ROUTE
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSIGNED,
        new_status=RequestStatus.EN_ROUTE,
        role=UserRole.RESPONDER
    )
    assert valid is True

    # Responder can mark completed: EN_ROUTE -> ASSISTANCE_PROVIDED (with note)
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.ASSISTANCE_PROVIDED,
        role=UserRole.RESPONDER,
        assistance_confirmed=True,
        assistance_notes="Safely retrieved and transported to triage tent."
    )
    assert valid is True

    # Responder CANNOT close request directly
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.ASSISTANCE_PROVIDED,
        new_status=RequestStatus.CLOSED,
        role=UserRole.RESPONDER,
        closure_explanation="Done by responder unit"
    )
    assert valid is False
    assert "Responders cannot transition" in err

    # Responder CANNOT verify a request
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status=RequestStatus.VERIFIED,
        role=UserRole.RESPONDER
    )
    assert valid is False

    # Citizen can cancel if in RECEIVED or VERIFIED
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status=RequestStatus.CANCELLED,
        role=UserRole.CITIZEN
    )
    assert valid is True

    # Citizen CANNOT cancel once ASSIGNED or EN_ROUTE
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.EN_ROUTE,
        new_status=RequestStatus.CANCELLED,
        role=UserRole.CITIZEN
    )
    assert valid is False
    assert "Citizen cannot cancel" in err

    # Unknown role
    valid, err = status_workflow_service.validate_transition(
        current_status=RequestStatus.RECEIVED,
        new_status=RequestStatus.VERIFIED,
        role="VOLUNTEER"
    )
    assert valid is False
    assert "not authorized" in err
