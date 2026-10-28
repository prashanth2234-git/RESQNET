import pytest
from app.models.responder import ResponderProfile

def test_assignment_workflow_and_workload_capacity(
    client, coord_auth_headers, responder_auth_headers, responder_user, db_session
):
    profile = db_session.query(ResponderProfile).filter(ResponderProfile.user_id == responder_user.id).first()
    # Responder has max_concurrent_assignments = 2 (from conftest)

    # 1. Create 3 requests
    req_ids = []
    for i in range(3):
        res = client.post("/api/requests", json={
            "title": f"Incident {i}",
            "incident_type": "Flood",
            "description": f"Incident description {i}",
            "location_name": f"Sector {i}",
            "people_affected": 2,
            "people_urgent": 0,
            "assistance_category": "Rescue"
        })
        req_ids.append(res.json()["id"])

    # 2. Assign 1st request -> Success
    assign_res1 = client.post(
        f"/api/requests/{req_ids[0]}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res1.status_code == 200
    assert assign_res1.json()["status"] == "ASSIGNED"

    # 3. Assign 2nd request -> Success (reaches capacity 2/2)
    assign_res2 = client.post(
        f"/api/requests/{req_ids[1]}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res2.status_code == 200

    # 4. Assign 3rd request without override reason -> Fails with 400 capacity exceeded
    assign_res3_fail = client.post(
        f"/api/requests/{req_ids[2]}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res3_fail.status_code == 400
    assert "reached max capacity" in assign_res3_fail.json()["detail"]

    # 5. Assign 3rd request WITH explicit override reason -> Success
    assign_res3_success = client.post(
        f"/api/requests/{req_ids[2]}/assign",
        headers=coord_auth_headers,
        json={
            "responder_id": profile.id,
            "override_workload_reason": "Emergency surge authorization by Incident Commander."
        }
    )
    assert assign_res3_success.status_code == 200

    # 6. Responder accepts first assignment
    my_assignments = client.get("/api/responders/me/assignments", headers=responder_auth_headers).json()
    first_assignment_id = my_assignments[-1]["id"]

    accept_res = client.post(
        f"/api/assignments/{first_assignment_id}/accept",
        headers=responder_auth_headers
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"
    assert accept_res.json()["request_status"] == "EN_ROUTE"

    # 7. Responder completes first assignment
    comp_res = client.post(
        f"/api/assignments/{first_assignment_id}/complete",
        headers=responder_auth_headers,
        json={"assistance_notes": "Delivered lifejackets and stabilized family."}
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"
    assert comp_res.json()["request_status"] == "ASSISTANCE_PROVIDED"

def test_unit_assignment_visibility_and_isolation(
    client, coord_auth_headers, responder_auth_headers, responder_user, db_session
):
    from app.core.security import hash_password, create_access_token
    from app.models.user import User, UserRole
    from app.models.responder import ResponderProfile, ResponderAvailability

    # Create Unit 2 (Flood Boat Squadron Bravo)
    user2 = User(
        email="water.bravo@resqnet.org",
        full_name="Lt. Carlos Mendez",
        hashed_password=hash_password("Responder#2026"),
        role=UserRole.RESPONDER,
        is_active=True
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    profile2 = ResponderProfile(
        user_id=user2.id,
        team="Flood Boat Squadron Bravo",
        supported_categories='["Rescue", "Food and water"]',
        max_concurrent_assignments=3,
        current_assignment_count=0,
        availability=ResponderAvailability.AVAILABLE
    )
    db_session.add(profile2)
    db_session.commit()
    db_session.refresh(profile2)

    unit2_token = create_access_token(subject=user2.id, role=user2.role)
    unit2_headers = {"Authorization": f"Bearer {unit2_token}"}

    # 1. Coordinator creates request REQ-0009
    create_res = client.post("/api/requests", json={
        "title": "Stranded motorists in flooded underpass",
        "incident_type": "Flood",
        "description": "Two passenger cars caught in sudden drainage surge under railway bridge.",
        "location_name": "Industrial Blvd railway underpass",
        "people_affected": 3,
        "people_urgent": 2,
        "assistance_category": "Rescue",
    })
    req_id = create_res.json()["id"]

    # 2. Coordinator assigns request to Unit 2 (Flood Boat Squadron Bravo)
    assign_res = client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile2.id}
    )
    assert assign_res.status_code == 200
    assignment_id = [a["id"] for a in assign_res.json()["assignments"] if a["responder_id"] == profile2.id][0]

    # 3. Assigned unit's authorized responder (Lt. Carlos Mendez) CAN see the active incident
    unit2_assignments = client.get("/api/responders/me/assignments", headers=unit2_headers).json()
    unit2_asg_ids = [a["id"] for a in unit2_assignments]
    assert assignment_id in unit2_asg_ids
    found_asg = [a for a in unit2_assignments if a["id"] == assignment_id][0]
    assert found_asg["request_id"] == req_id
    assert found_asg["status"] == "ASSIGNED"
    assert found_asg["responder_team"] == "Flood Boat Squadron Bravo"

    # 4. Responder from another unit (Capt. Marcus Vance / Unit 1) CANNOT see the incident in their assignments
    unit1_assignments = client.get("/api/responders/me/assignments", headers=responder_auth_headers).json()
    unit1_asg_ids = [a["id"] for a in unit1_assignments]
    assert assignment_id not in unit1_asg_ids
    assert not any(a["request_id"] == req_id for a in unit1_assignments)

    # 5. Responder from another unit CANNOT update or accept that incident
    # Cannot accept Unit 2's assignment
    accept_attempt = client.post(
        f"/api/assignments/{assignment_id}/accept",
        headers=responder_auth_headers
    )
    assert accept_attempt.status_code == 403
    assert "Cannot accept an assignment designated for another team" in accept_attempt.json()["detail"]

    # Cannot transition status of request
    status_attempt = client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "EN_ROUTE"}
    )
    assert status_attempt.status_code == 403
    assert "Responders can only update requests actively assigned to their unit" in status_attempt.json()["detail"]

def test_reassigning_to_existing_unit_does_not_create_duplicate(
    client, coord_auth_headers, responder_user, db_session
):
    from app.models.assignment import Assignment
    from app.models.responder import ResponderProfile

    profile = db_session.query(ResponderProfile).filter(ResponderProfile.user_id == responder_user.id).first()

    # Create request
    create_res = client.post("/api/requests", json={
        "title": "Fallen tree blocking ambulance route",
        "incident_type": "Storm",
        "description": "Tree limb obstructing hospital access road.",
        "location_name": "Hospital Blvd",
        "people_affected": 1,
        "people_urgent": 0,
        "assistance_category": "Rescue"
    })
    req_id = create_res.json()["id"]

    # 1. Assign to responder unit
    assign_res1 = client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res1.status_code == 200

    # 2. Attempt to assign again to the same unit -> 400 Bad Request
    assign_res2 = client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    assert assign_res2.status_code == 400
    assert "already actively assigned to unit" in assign_res2.json()["detail"]

    # 3. Verify exactly 1 assignment exists for this request
    asg_count = db_session.query(Assignment).filter(Assignment.request_id == req_id).count()
    assert asg_count == 1

def test_completed_or_closed_incidents_not_active(
    client, coord_auth_headers, responder_auth_headers, responder_user, db_session
):
    from app.models.assignment import Assignment, AssignmentStatus
    from app.models.responder import ResponderProfile

    profile = db_session.query(ResponderProfile).filter(ResponderProfile.user_id == responder_user.id).first()

    # Create request
    create_res = client.post("/api/requests", json={
        "title": "Basement pumping required",
        "incident_type": "Flood",
        "description": "Basement sub-panel submerged in water.",
        "location_name": "Lakeview Drive 44",
        "people_affected": 2,
        "people_urgent": 0,
        "assistance_category": "Rescue"
    })
    req_id = create_res.json()["id"]

    # Assign to responder
    client.post(
        f"/api/requests/{req_id}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )

    # Move to EN_ROUTE
    client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={"new_status": "EN_ROUTE", "explanation": "Pump team en route with submersible pump."}
    )

    # Move to ASSISTANCE_PROVIDED
    client.post(
        f"/api/requests/{req_id}/status",
        headers=responder_auth_headers,
        json={
            "new_status": "ASSISTANCE_PROVIDED",
            "assistance_confirmed": True,
            "assistance_notes": "Submersible pump cleared basement; electrical hazards safely mitigated."
        }
    )

    # Coordinator closes the incident
    close_res = client.post(
        f"/api/requests/{req_id}/status",
        headers=coord_auth_headers,
        json={"new_status": "CLOSED", "closure_explanation": "Inspection completed and homeowner signoff received."}
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # Verify assignment status is COMPLETED
    assignment = db_session.query(Assignment).filter(
        Assignment.request_id == req_id,
        Assignment.responder_id == profile.id
    ).first()
    assert assignment.status == AssignmentStatus.COMPLETED

    # Verify responder workload is 0 in the responder directory
    responders_list = client.get("/api/responders", headers=coord_auth_headers).json()
    resp_entry = [r for r in responders_list if r["id"] == profile.id][0]
    assert resp_entry["current_assignment_count"] == 0

    # Test direct coordinator closure on an active assignment:
    create_res2 = client.post("/api/requests", json={
        "title": "Minor storm branch on vehicle",
        "incident_type": "Storm",
        "description": "Branch cleared by neighbor before team arrival.",
        "location_name": "Pine St",
        "people_affected": 1,
        "people_urgent": 0,
        "assistance_category": "Rescue"
    })
    req_id2 = create_res2.json()["id"]
    client.post(
        f"/api/requests/{req_id2}/assign",
        headers=coord_auth_headers,
        json={"responder_id": profile.id}
    )
    # Direct closure with coordinator override
    override_close_res = client.post(
        f"/api/requests/{req_id2}/status",
        headers=coord_auth_headers,
        json={
            "new_status": "CLOSED",
            "is_override": True,
            "override_reason": "Resident confirmed branch was removed by neighbours; no response needed.",
            "closure_explanation": "Resident confirmed branch was removed by neighbours; no response needed."
        }
    )
    assert override_close_res.status_code == 200
    assignment2 = db_session.query(Assignment).filter(
        Assignment.request_id == req_id2,
        Assignment.responder_id == profile.id
    ).first()
    assert assignment2.status == AssignmentStatus.COMPLETED
    db_session.refresh(profile)
    assert profile.current_assignment_count == 0
