import pytest

def test_dashboard_summary_and_analytics(client, coord_auth_headers):
    # 1. Fetch summary
    summary_res = client.get("/api/dashboard/summary", headers=coord_auth_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "total_active_requests" in summary
    assert "critical_awaiting_review" in summary
    assert summary["is_live_data"] is True

    # 2. Fetch analytics
    analytics_res = client.get("/api/dashboard/analytics", headers=coord_auth_headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert "status_distribution" in analytics
    assert "incident_type_distribution" in analytics
    assert "priority_distribution" in analytics

def test_idempotent_offline_sync(client):
    batch_payload = {
        "items": [
            {
                "title": "Offline Request Alpha",
                "incident_type": "Flood",
                "description": "Submitted while cell network was offline.",
                "location_name": "Grid 44",
                "people_affected": 2,
                "people_urgent": 0,
                "assistance_category": "Shelter",
                "idempotency_key": "offline-client-uuid-99901",
                "client_local_id": "local-item-1"
            }
        ]
    }

    # 1. First sync -> Status "CREATED"
    sync1 = client.post("/api/sync/requests", json=batch_payload)
    assert sync1.status_code == 200
    data1 = sync1.json()
    assert data1["successful_count"] == 1
    result1 = data1["results"][0]
    assert result1["status"] == "CREATED"
    server_id = result1["server_request_id"]
    tracking_code = result1["tracking_code"]
    assert server_id is not None
    assert tracking_code is not None

    # 2. Duplicate sync with same idempotency key -> Status "EXISTING_IDEMPOTENT", same ID
    sync2 = client.post("/api/sync/requests", json=batch_payload)
    assert sync2.status_code == 200
    data2 = sync2.json()
    result2 = data2["results"][0]
    assert result2["status"] == "EXISTING_IDEMPOTENT"
    assert result2["server_request_id"] == server_id
    assert result2["tracking_code"] == tracking_code

def test_sync_with_existing_assistance_request_and_integrity_safety(client, db_session):
    from app.models.request import AssistanceRequest, RequestStatus, PriorityBand
    from app.models.sync_record import SynchronizationRecord

    # 1. Pre-create AssistanceRequest (as if submitted online or by concurrent thread)
    idemp_key = "idemp-concurrent-test-888"
    local_id = "offline-concurrent-local-888"
    existing_req = AssistanceRequest(
        tracking_code="REQ-TEST-SYNC-888",
        title="Concurrent River Flooding Rescue",
        incident_type="Flood",
        description="Stranded resident on roof during sudden surge.",
        location_name="Zone 9 Waterway",
        people_affected=2,
        people_urgent=1,
        assistance_category="Rescue",
        is_immediate_threat=True,
        is_medical_emergency=False,
        is_vulnerable_present=True,
        is_essential_unavailable=False,
        safe_contact_method="Phone",
        status=RequestStatus.RECEIVED,
        calculated_priority_score=85,
        priority_band=PriorityBand.CRITICAL,
        idempotency_key=idemp_key,
        client_local_id=local_id,
    )
    db_session.add(existing_req)
    db_session.commit()
    db_session.refresh(existing_req)

    # 2. Also pre-insert SynchronizationRecord to simulate concurrent thread commit
    existing_sync = SynchronizationRecord(
        idempotency_key=idemp_key,
        client_local_id=local_id,
        server_request_id=existing_req.id,
        sync_status="SUCCESS"
    )
    db_session.add(existing_sync)
    db_session.commit()

    # 3. Client sends sync request with the exact same idempotency_key
    payload = {
        "items": [
            {
                "title": "Concurrent River Flooding Rescue",
                "incident_type": "Flood",
                "description": "Stranded resident on roof during sudden surge.",
                "location_name": "Zone 9 Waterway",
                "people_affected": 2,
                "people_urgent": 1,
                "assistance_category": "Rescue",
                "idempotency_key": idemp_key,
                "client_local_id": local_id,
            }
        ]
    }

    res = client.post("/api/sync/requests", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["successful_count"] == 1
    assert data["results"][0]["status"] == "EXISTING_IDEMPOTENT"
    assert data["results"][0]["server_request_id"] == existing_req.id
    assert data["results"][0]["tracking_code"] == "REQ-TEST-SYNC-888"

def test_sync_retry_scenario_preserves_idempotency_and_succeeds(client):
    # 1. First attempt: Simulate batch with valid retryable request
    idemp_key = "idemp-retry-test-777"
    local_id = "offline-retry-local-777"
    payload = {
        "items": [
            {
                "title": "Post-Disaster Medical Insulin Delivery",
                "incident_type": "Medical assistance",
                "description": "Insulin required within 6 hours.",
                "location_name": "Sector 4 Block B",
                "people_affected": 1,
                "people_urgent": 1,
                "assistance_category": "Medical assistance",
                "is_immediate_threat": True,
                "is_medical_emergency": True,
                "idempotency_key": idemp_key,
                "client_local_id": local_id,
            }
        ]
    }

    res1 = client.post("/api/sync/requests", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["successful_count"] == 1
    res1_item = data1["results"][0]
    assert res1_item["status"] == "CREATED"
    server_id = res1_item["server_request_id"]
    tracking_code = res1_item["tracking_code"]

    # 2. Retry attempt (e.g. if client temporarily saw network hiccup right after server processed)
    # The retry MUST succeed idempotently without creating duplicate requests or erroring
    res2 = client.post("/api/sync/requests", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["successful_count"] == 1
    res2_item = data2["results"][0]
    assert res2_item["status"] == "EXISTING_IDEMPOTENT"
    assert res2_item["server_request_id"] == server_id
    assert res2_item["tracking_code"] == tracking_code
