import pytest

def test_create_assistance_request_anonymous(client):
    payload = {
        "title": "Flooded ground floor with elderly occupant",
        "incident_type": "Flood",
        "description": "Water rising above steps. Occupant cannot climb stairs.",
        "location_name": "Sector 4 Canal Bank",
        "latitude": 25.78,
        "longitude": -80.20,
        "people_affected": 2,
        "people_urgent": 1,
        "assistance_category": "Rescue",
        "is_immediate_threat": True,
        "is_medical_emergency": False,
        "is_vulnerable_present": True,
        "is_essential_unavailable": False,
        "safe_contact_method": "Phone",
        "contact_details": "+1 555-0199"
    }
    response = client.post("/api/requests", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "tracking_code" in data
    assert data["status"] == "RECEIVED"
    # 35 (threat) + 8 (1 urgent) + 10 (vulnerable) = 53 -> HIGH
    assert data["calculated_priority_score"] == 53
    assert data["priority_band"] == "HIGH"

def test_coordinator_verify_and_priority_override(client, coord_auth_headers):
    # 1. Create a request
    create_res = client.post("/api/requests", json={
        "title": "Minor wind damage",
        "incident_type": "Storm",
        "description": "Small tree branch fell on porch.",
        "location_name": "Oak Street",
        "people_affected": 1,
        "people_urgent": 0,
        "assistance_category": "Essential supplies",
        "is_immediate_threat": False,
        "is_medical_emergency": False,
        "is_vulnerable_present": False,
        "is_essential_unavailable": False
    })
    assert create_res.status_code == 201
    req_id = create_res.json()["id"]

    # 2. Coordinator verifies request
    verify_res = client.post(
        f"/api/requests/{req_id}/verify",
        headers=coord_auth_headers,
        json={"verification_notes": "Verified details via phone triage."}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # 3. Coordinator overrides priority
    override_res = client.post(
        f"/api/requests/{req_id}/priority-override",
        headers=coord_auth_headers,
        json={
            "override_score": 85,
            "override_band": "CRITICAL",
            "reason": "Secondary gas leak detected on site during phone interview."
        }
    )
    assert override_res.status_code == 200
    assert override_res.json()["effective_priority_score"] == 85
    assert override_res.json()["effective_priority_band"] == "CRITICAL"
    assert override_res.json()["priority_override_reason"] == "Secondary gas leak detected on site during phone interview."

def test_citizen_updates_own_request(client, citizen_auth_headers):
    # Citizen creates request
    create_res = client.post(
        "/api/requests",
        headers=citizen_auth_headers,
        json={
            "title": "Water rising near front gate",
            "incident_type": "Flood",
            "description": "Road flooded. Gate is covered.",
            "location_name": "Pine Court",
            "people_affected": 3,
            "people_urgent": 0,
            "assistance_category": "Evacuation support",
            "safe_contact_method": "Phone",
            "contact_details": "Old Number 123"
        }
    )
    req_id = create_res.json()["id"]

    # Citizen updates contact details
    patch_res = client.patch(
        f"/api/requests/{req_id}",
        headers=citizen_auth_headers,
        json={"contact_details": "New Number 999", "safe_contact_method": "SMS"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["contact_details"] == "New Number 999"
    assert patch_res.json()["safe_contact_method"] == "SMS"

def test_status_workflow_api_validation(client, coord_auth_headers):
    # 1. Create a request
    create_res = client.post("/api/requests", json={
        "title": "Medical supply request",
        "incident_type": "Medical",
        "description": "Patient needs insulin delivery following power outage.",
        "location_name": "Clinic Road",
        "people_affected": 1,
        "people_urgent": 1,
        "assistance_category": "Medical assistance",
        "is_medical_emergency": True,
    })
    req_id = create_res.json()["id"]

    # 2. Transition RECEIVED -> VERIFIED (200)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "VERIFIED", "explanation": "Phone triage confirmed insulin urgency."}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "VERIFIED"

    # 3. Invalid jump: VERIFIED -> CLOSED without override (400)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": "Attempted premature close."}
    )
    assert res.status_code == 400
    assert "Invalid coordinator transition" in res.json()["detail"]

    # 4. Valid forward: VERIFIED -> ASSIGNED -> EN_ROUTE
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "ASSIGNED", "explanation": "Dispatching medical courier."}
    )
    assert res.status_code == 200

    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "EN_ROUTE", "explanation": "Courier en route to clinic."}
    )
    assert res.status_code == 200

    # 5. EN_ROUTE -> ASSISTANCE_PROVIDED without confirmation (400)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={
            "new_status": "ASSISTANCE_PROVIDED",
            "assistance_confirmed": False,
            "assistance_notes": "Insulin delivered successfully."
        }
    )
    assert res.status_code == 400
    assert "Explicit confirmation" in res.json()["detail"]

    # 6. EN_ROUTE -> ASSISTANCE_PROVIDED with reused/duplicate previous note (400)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={
            "new_status": "ASSISTANCE_PROVIDED",
            "assistance_confirmed": True,
            "assistance_notes": "Courier en route to clinic."  # identical to previous note
        }
    )
    assert res.status_code == 400
    assert "cannot be identical to the previous status note" in res.json()["detail"]

    # 7. EN_ROUTE -> ASSISTANCE_PROVIDED with valid confirmation & fresh note (200)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={
            "new_status": "ASSISTANCE_PROVIDED",
            "assistance_confirmed": True,
            "assistance_notes": "Insulin package handed directly to patient and verified intact."
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ASSISTANCE_PROVIDED"

    # 8. ASSISTANCE_PROVIDED -> CLOSED without closure explanation (400)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "CLOSED"}
    )
    assert res.status_code == 400
    assert "closure explanation" in res.json()["detail"]

    # 9. ASSISTANCE_PROVIDED -> CLOSED with valid closure explanation (200)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={
            "new_status": "CLOSED",
            "closure_explanation": "Incident concluded with medical delivery confirmed complete."
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"

def test_status_override_api_and_audit(client, coord_auth_headers, db_session):
    from app.models.audit_log import AuditLog

    # Create request
    create_res = client.post("/api/requests", json={
        "title": "Road debris blocking culvert",
        "incident_type": "Debris",
        "description": "Fallen tree blocking storm water drain.",
        "location_name": "Bay Road",
        "people_affected": 2,
        "people_urgent": 0,
        "assistance_category": "Essential supplies",
    })
    req_id = create_res.json()["id"]

    # Override without meaningful reason (< 10 chars) returns 400
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "ASSIGNED", "is_override": True, "override_reason": "Short"}
    )
    assert res.status_code == 400
    assert "at least 10 characters" in res.json()["detail"]

    # Override with valid reason succeeds (200)
    override_reason = "Special coordinator direct dispatch due to impending rainfall forecast."
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "ASSIGNED", "is_override": True, "override_reason": override_reason}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ASSIGNED"

    # Verify AuditLog has recorded actor, previous_status, new_status, reason, and timestamp
    audit_entry = db_session.query(AuditLog).filter(
        AuditLog.action == "STATUS_OVERRIDE",
        AuditLog.entity_id == req_id
    ).first()
    assert audit_entry is not None
    import json
    details = json.loads(audit_entry.details_json)
    assert details["previous_status"] == "RECEIVED"
    assert details["new_status"] == "ASSIGNED"
    assert details["reason"] == override_reason
    assert "actor" in details
    assert "timestamp" in details

def test_responder_status_assignment_authorization(
    client, coord_auth_headers, coordinator_user, responder_auth_headers, responder_user, citizen_auth_headers, citizen_user, db_session
):
    from app.models.responder import ResponderProfile
    from app.models.assignment import Assignment, AssignmentStatus
    from app.models.status_history import StatusHistory
    from app.models.audit_log import AuditLog
    import json

    # 1. Create request
    create_res = client.post("/api/requests", json={
        "title": "Evacuation assistance needed",
        "incident_type": "Flood",
        "description": "Two individuals stranded on raised patio.",
        "location_name": "River Path",
        "people_affected": 2,
        "people_urgent": 1,
        "assistance_category": "Rescue",
    })
    req_id = create_res.json()["id"]

    # 2. Responder tries to update status before being assigned -> 403 Forbidden
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "EN_ROUTE"}
    )
    assert res.status_code == 403
    assert "Responders can only update requests actively assigned to their unit" in res.json()["detail"]

    # 3. Coordinator assigns responder to the request
    profile = db_session.query(ResponderProfile).filter(ResponderProfile.user_id == responder_user.id).first()
    assign_res = client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res.status_code == 200

    # 4. Assigned responder can transition to EN_ROUTE
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "EN_ROUTE", "explanation": "Rescue team moving out in Zodiac boat."}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "EN_ROUTE"

    # 5. Responder with active assignment tries to jump to CLOSED directly -> 400 Bad Request
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": "Responder attempting direct closure while en route."}
    )
    assert res.status_code == 400
    assert "Responders cannot transition request from 'EN_ROUTE' to 'CLOSED'" in res.json()["detail"]

    # 6. Assigned responder marks ASSISTANCE_PROVIDED (with confirmation & notes)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={
            "new_status": "ASSISTANCE_PROVIDED",
            "assistance_confirmed": True,
            "assistance_notes": "Both stranded individuals successfully brought aboard Zodiac and brought to shore."
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ASSISTANCE_PROVIDED"

    # Verify assignment is now COMPLETED
    assignment = db_session.query(Assignment).filter(
        Assignment.request_id == req_id,
        Assignment.responder_id == profile.id
    ).first()
    assert assignment is not None
    assert assignment.status == AssignmentStatus.COMPLETED

    # 7. Once assignment is completed, responder cannot further modify request -> 403 Forbidden
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": "Responder attempting closure."}
    )
    assert res.status_code == 403
    assert "Responders can only update requests actively assigned to their unit" in res.json()["detail"]

    # Citizen cannot close the incident -> 403 Forbidden
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=citizen_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": "Citizen attempting closure."}
    )
    assert res.status_code == 403

    # 8. Authorized Coordinator completes closure
    closure_text = "Verified with rescue squad and closed incident."
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": closure_text}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"

    # 9. Verify post-closure persistence:
    # A. Responder assignment remains COMPLETED
    db_session.refresh(assignment)
    assert assignment.status == AssignmentStatus.COMPLETED

    # B. StatusHistory contains closure explanation and coordinator actor
    history_records = db_session.query(StatusHistory).filter(
        StatusHistory.request_id == req_id
    ).order_by(StatusHistory.id.desc()).all()
    latest_history = history_records[0]
    assert latest_history.new_status == "CLOSED"
    assert latest_history.previous_status == "ASSISTANCE_PROVIDED"
    assert latest_history.changed_by_user_id == coordinator_user.id
    assert closure_text in latest_history.explanation

    # C. Audit log contains STATUS_CLOSED event with coordinator actor details
    audit_log = db_session.query(AuditLog).filter(
        AuditLog.action == "STATUS_CLOSED",
        AuditLog.entity_id == req_id
    ).first()
    assert audit_log is not None
    details = json.loads(audit_log.details_json)
    assert details["actor_role"] == "COORDINATOR"
    assert details["actor_id"] == coordinator_user.id
    assert details["previous_status"] == "ASSISTANCE_PROVIDED"
    assert details["new_status"] == "CLOSED"
    assert closure_text in details["explanation"]

    # D. Responders still cannot modify the closed incident through normal workflow -> 403
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "VERIFIED"}
    )
    assert res.status_code == 403
    assert "Responders can only update requests actively assigned to their unit" in res.json()["detail"]

    # E. Invalid coordinator workflow transitions without override remain rejected (400)
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "VERIFIED"}
    )
    assert res.status_code == 400
    assert "Invalid coordinator transition" in res.json()["detail"]

    # F. Administrative override allows valid coordinator override from CLOSED to VERIFIED
    override_reason = "Reopening incident following citizen report of recurring water surge."
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={
            "new_status": "VERIFIED",
            "is_override": True,
            "override_reason": override_reason
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "VERIFIED"

    override_audit = db_session.query(AuditLog).filter(
        AuditLog.action == "STATUS_OVERRIDE",
        AuditLog.entity_id == req_id
    ).order_by(AuditLog.id.desc()).first()
    assert override_audit is not None
    ov_details = json.loads(override_audit.details_json)
    assert ov_details["previous_status"] == "CLOSED"
    assert ov_details["new_status"] == "VERIFIED"
    assert ov_details["reason"] == override_reason

def test_unassigned_responder_cannot_update_another_units_incident(
    client, coord_auth_headers, responder_user, db_session
):
    from app.core.security import hash_password, create_access_token
    from app.models.user import User, UserRole
    from app.models.responder import ResponderProfile, ResponderAvailability

    # Create Unit 2 responder
    user2 = User(
        email="medic.bravo@resqnet.org",
        full_name="Paramedic Bravo",
        hashed_password=hash_password("Pass#123"),
        role=UserRole.RESPONDER,
        is_active=True
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    profile2 = ResponderProfile(
        user_id=user2.id,
        team="Paramedic Bravo Unit",
        supported_categories='["Medical assistance"]',
        max_concurrent_assignments=2,
        current_assignment_count=0,
        availability=ResponderAvailability.AVAILABLE
    )
    db_session.add(profile2)
    db_session.commit()
    db_session.refresh(profile2)

    unit2_token = create_access_token(subject=user2.id, role=user2.role)
    unit2_headers = {"Authorization": f"Bearer {unit2_token}"}

    # Create request and assign it to Unit 1 (responder_user)
    create_res = client.post("/api/requests", json={
        "title": "Medical emergency on 5th floor",
        "incident_type": "Medical",
        "description": "Patient experiencing respiratory distress.",
        "location_name": "Highrise Tower",
        "people_affected": 1,
        "people_urgent": 1,
        "assistance_category": "Medical assistance",
    })
    req_id = create_res.json()["id"]

    unit1_profile = db_session.query(ResponderProfile).filter(ResponderProfile.user_id == responder_user.id).first()
    assign_res = client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": unit1_profile.id}
    )
    assert assign_res.status_code == 200

    # Unit 2 attempts to transition or update status -> 403 Forbidden
    res = client.post(
        f"/api/requests/{req_id}/status",
        headers=unit2_headers,
        json={"new_status": "EN_ROUTE"}
    )
    assert res.status_code == 403
    assert "Responders can only update requests actively assigned to their unit" in res.json()["detail"]

def test_assignment_endpoint_completion_and_coordinator_closure(
    client, coord_auth_headers, coordinator_user, responder_auth_headers, responder_user, db_session
):
    from app.models.responder import ResponderProfile
    from app.models.assignment import Assignment, AssignmentStatus
    from app.models.audit_log import AuditLog
    import json

    # 1. Create request
    create_res = client.post("/api/requests", json={
        "title": "Severe roof collapse requiring extraction",
        "incident_type": "Collapse",
        "description": "Portion of warehouse roof caved in.",
        "location_name": "Industrial Way 12",
        "people_affected": 3,
        "people_urgent": 1,
        "assistance_category": "Rescue",
    })
    req_id = create_res.json()["id"]

    # 2. Assign to responder
    profile = db_session.query(ResponderProfile).filter(ResponderProfile.user_id == responder_user.id).first()
    assign_res = client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res.status_code == 200
    assignment_id = assign_res.json()["id"]

    # 3. Responder accepts via /assignments/{id}/accept
    accept_res = client.post(
        f"/api/assignments/{assignment_id}/accept",
        headers=responder_auth_headers
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == AssignmentStatus.ACCEPTED

    # Verify request status transitioned to EN_ROUTE
    req_data = client.get(f"/api/requests/{req_id}").json()
    assert req_data["status"] == "EN_ROUTE"

    # 4. Responder completes via /assignments/{id}/complete
    complete_res = client.post(
        f"/api/assignments/{assignment_id}/complete",
        headers=responder_auth_headers,
        json={"assistance_notes": "All three trapped individuals safely extracted and handed to triage."}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == AssignmentStatus.COMPLETED

    # Verify request status transitioned to ASSISTANCE_PROVIDED
    req_data = client.get(f"/api/requests/{req_id}").json()
    assert req_data["status"] == "ASSISTANCE_PROVIDED"

    # 5. Coordinator closes the incident via /requests/{id}/status
    closure_text = "Structural engineer inspected perimeter and site secured."
    close_res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": closure_text}
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 6. Verify assignment remains COMPLETED
    assignment = db_session.query(Assignment).filter(Assignment.id == assignment_id).first()
    assert assignment.status == AssignmentStatus.COMPLETED

    # 7. Verify audit log has STATUS_CLOSED with coordinator details
    audit_entry = db_session.query(AuditLog).filter(
        AuditLog.action == "STATUS_CLOSED",
        AuditLog.entity_id == req_id
    ).first()
    assert audit_entry is not None
    details = json.loads(audit_entry.details_json)
    assert details["actor_role"] == "COORDINATOR"
    assert details["actor_id"] == coordinator_user.id
    assert details["previous_status"] == "ASSISTANCE_PROVIDED"
    assert details["new_status"] == "CLOSED"
    assert closure_text in details["explanation"]

def test_critical_unresolved_incident_watchlist_filtering(
    client, coord_auth_headers, db_session
):
    from app.models.request import AssistanceRequest, RequestStatus, PriorityBand

    # 1. Create a critical unresolved incident (RECEIVED) with high score
    req1 = AssistanceRequest(
        tracking_code="REQ-TEST-UNRESOLVED-1",
        title="Active trapped victims in rising flood",
        incident_type="Flood",
        description="Water rapidly rising on first floor.",
        location_name="Zone A Riverbank",
        people_affected=4,
        people_urgent=2,
        assistance_category="Rescue",
        is_immediate_threat=True,
        is_medical_emergency=True,
        is_vulnerable_present=True,
        is_essential_unavailable=False,
        safe_contact_method="Phone",
        status=RequestStatus.RECEIVED,
        calculated_priority_score=85,
        priority_band=PriorityBand.CRITICAL,
    )
    db_session.add(req1)

    # 2. Create another critical unresolved incident (ASSIGNED) with higher score
    req2 = AssistanceRequest(
        tracking_code="REQ-TEST-UNRESOLVED-2",
        title="Immediate structural collapse rescue",
        incident_type="Storm",
        description="Trapped individuals under collapsed beam.",
        location_name="Zone B Downtown",
        people_affected=2,
        people_urgent=2,
        assistance_category="Rescue",
        is_immediate_threat=True,
        is_medical_emergency=True,
        is_vulnerable_present=True,
        is_essential_unavailable=False,
        safe_contact_method="Radio",
        status=RequestStatus.ASSIGNED,
        calculated_priority_score=95,
        priority_band=PriorityBand.CRITICAL,
    )
    db_session.add(req2)

    # 3. Create a critical CLOSED incident (REQ-0001 pattern: was critical, now closed)
    req_closed = AssistanceRequest(
        tracking_code="REQ-TEST-CLOSED",
        title="Balcony entrapment successfully concluded",
        incident_type="Flood",
        description="Rescued and placed in temporary shelter.",
        location_name="Zone C Bay",
        people_affected=3,
        people_urgent=1,
        assistance_category="Rescue",
        is_immediate_threat=True,
        is_medical_emergency=True,
        is_vulnerable_present=True,
        is_essential_unavailable=False,
        safe_contact_method="Phone",
        status=RequestStatus.CLOSED,
        calculated_priority_score=100,
        priority_band=PriorityBand.CRITICAL,
    )
    db_session.add(req_closed)

    # 4. Create a critical CANCELLED incident
    req_cancelled = AssistanceRequest(
        tracking_code="REQ-TEST-CANCELLED",
        title="False alarm water surge call",
        incident_type="Flood",
        description="Caller evacuated safely on their own before response.",
        location_name="Zone D Hills",
        people_affected=1,
        people_urgent=0,
        assistance_category="Rescue",
        is_immediate_threat=True,
        is_medical_emergency=False,
        is_vulnerable_present=False,
        is_essential_unavailable=False,
        safe_contact_method="Phone",
        status=RequestStatus.CANCELLED,
        calculated_priority_score=80,
        priority_band=PriorityBand.CRITICAL,
    )
    db_session.add(req_cancelled)
    db_session.commit()

    # Query with is_unresolved=true (Watchlist query pattern)
    res = client.get(
        "/api/requests?priority_band=CRITICAL&is_unresolved=true",
        headers=coord_auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    tracking_codes = [i["tracking_code"] for i in items]

    # Verify: Critical unresolved incidents appear
    assert "REQ-TEST-UNRESOLVED-1" in tracking_codes
    assert "REQ-TEST-UNRESOLVED-2" in tracking_codes

    # Verify: Critical CLOSED incident is excluded
    assert "REQ-TEST-CLOSED" not in tracking_codes

    # Verify: Critical CANCELLED incident is excluded
    assert "REQ-TEST-CANCELLED" not in tracking_codes

    # Verify: Existing priority ordering is preserved (Score 95 before Score 85)
    unresolved_items = [i for i in items if i["tracking_code"] in ["REQ-TEST-UNRESOLVED-1", "REQ-TEST-UNRESOLVED-2"]]
    assert unresolved_items[0]["tracking_code"] == "REQ-TEST-UNRESOLVED-2"
    assert unresolved_items[0]["calculated_priority_score"] == 95
    assert unresolved_items[1]["tracking_code"] == "REQ-TEST-UNRESOLVED-1"
    assert unresolved_items[1]["calculated_priority_score"] == 85

    # Verify: Watchlist handles an empty result correctly
    empty_res = client.get(
        "/api/requests?priority_band=CRITICAL&is_unresolved=true&incident_type=NonExistentHazard",
        headers=coord_auth_headers
    )
    assert empty_res.status_code == 200
    empty_data = empty_res.json()
    assert empty_data["items"] == []
    assert empty_data["total"] == 0

