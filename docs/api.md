# RESQNET API Reference Documentation

**Base URL**: `http://127.0.0.1:8000/api`  
**Interactive Swagger UI**: `http://127.0.0.1:8000/docs`  
**ReDoc Specification**: `http://127.0.0.1:8000/redoc`  

---

## Authentication & Authorization

All protected endpoints require a Bearer token header:
```http
Authorization: Bearer <jwt_access_token>
```

Tokens are signed using HMAC-SHA256 (`HS256`) and encode the user's ID (`sub`) and role (`role`).

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a user with email and password.
- **Request Body**:
  ```json
  {
    "email": "coordinator@resqnet.org",
    "password": "ResqnetCoord#2026"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "coordinator@resqnet.org",
      "full_name": "Chief Elena Vance",
      "role": "COORDINATOR",
      "phone": "+1 (555) 019-2831"
    }
  }
  ```

### `POST /api/auth/register`
Self-registration for citizen users.
- **Request Body**:
  ```json
  {
    "email": "resident@example.com",
    "password": "SecurePassword#2026",
    "full_name": "Jordan Smith",
    "phone": "+1 (555) 234-5678"
  }
  ```
- **Response** (`201 Created`): TokenResponse object.

### `GET /api/auth/me`
Fetches current user profile from access token.
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): UserSummary object.

---

## 2. Assistance Requests Endpoints

### `POST /api/requests`
Submits an assistance request (accessible to authenticated users or anonymous citizens).
- **Request Body**:
  ```json
  {
    "title": "Family trapped on second floor due to flood",
    "incident_type": "Flood",
    "description": "Ground floor submerged under 5 feet of water. 4 family members present.",
    "location_name": "812 Riverfront Dr, Sector 4",
    "latitude": 25.7892,
    "longitude": -80.2014,
    "people_affected": 4,
    "people_urgent": 2,
    "assistance_category": "Rescue",
    "is_immediate_threat": true,
    "is_medical_emergency": true,
    "is_vulnerable_present": true,
    "is_essential_unavailable": true,
    "safe_contact_method": "Phone",
    "contact_details": "+1 (555) 902-1144",
    "accessibility_medical_notes": "Elderly grandmother requires oxygen.",
    "idempotency_key": "optional-uuid-string"
  }
  ```
- **Response** (`201 Created`): Complete `RequestResponse` object including unique `tracking_code`, `calculated_priority_score`, `priority_band`, and factor breakdown.

### `GET /api/requests`
Retrieves requests with multi-field filtering and pagination.
- **Query Parameters**:
  - `incident_type` (string)
  - `priority_band` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
  - `status` (`RECEIVED`, `VERIFIED`, `ASSIGNED`, `EN_ROUTE`, `ASSISTANCE_PROVIDED`, `CLOSED`, etc.)
  - `assistance_category` (string)
  - `search` (string)
  - `assigned_state` (`assigned`, `unassigned`)
  - `tracking_code` (string - allows direct lookup)
  - `page` (integer, default 1)
  - `page_size` (integer, default 15)
- **Response** (`200 OK`):
  ```json
  {
    "items": [...],
    "total": 17,
    "page": 1,
    "page_size": 15,
    "total_pages": 2
  }
  ```

### `GET /api/requests/{request_id}`
Retrieves detailed information for a specific request, including status history and assigned units.
- **Response** (`200 OK`): RequestResponse object.

### `PATCH /api/requests/{request_id}`
Updates permitted citizen contact details.
- **Request Body**:
  ```json
  {
    "safe_contact_method": "SMS",
    "contact_details": "+1 (555) 999-0011",
    "accessibility_medical_notes": "Updated gate passcode is 4490"
  }
  ```

### `POST /api/requests/{request_id}/verify`
*(Coordinator Only)* Verifies situation details.
- **Request Body**:
  ```json
  {
    "verification_notes": "Confirmed 4 trapped residents via phone triage."
  }
  ```

### `POST /api/requests/{request_id}/priority-override`
*(Coordinator Only)* Administratively overrides the calculated priority score.
- **Request Body**:
  ```json
  {
    "override_score": 88,
    "override_band": "CRITICAL",
    "reason": "Secondary fuel leak reported near structure."
  }
  ```

### `POST /api/requests/{request_id}/assign`
*(Coordinator Only)* Dispatches a responder unit. Enforces workload capacity constraints.
- **Request Body**:
  ```json
  {
    "responder_id": 1,
    "override_workload_reason": "Emergency authorization by Incident Commander"
  }
  ```

### `POST /api/requests/{request_id}/status`
Transitions the state machine.
- **Request Body**:
  ```json
  {
    "new_status": "CLOSED",
    "explanation": "Case verified and resolved.",
    "is_override": false
  }
  ```

### `GET /api/requests/{request_id}/history`
Fetches chronological timeline of all status updates.

---

## 3. Responders & Assignments Endpoints

### `GET /api/responders`
Lists all responder units, current workloads, max capacities, and availability.

### `POST /api/responders`
*(Coordinator Only)* Registers a new response squad.

### `GET /api/responders/me/assignments`
*(Responder Only)* Fetches incidents assigned to the authenticated user's unit.

### `PATCH /api/responders/me/availability`
*(Responder Only)* Updates unit status (`AVAILABLE`, `BUSY`, `OFF_DUTY`).

### `POST /api/assignments/{assignment_id}/accept`
*(Responder Only)* Accepts assignment and transitions request to `EN_ROUTE`.

### `POST /api/assignments/{assignment_id}/complete`
*(Responder Only)* Marks mission complete, submits field notes, and transitions request to `ASSISTANCE_PROVIDED`.
- **Request Body**:
  ```json
  {
    "assistance_notes": "Evacuated 4 residents via rescue dinghy. Stabilized grandmother."
  }
  ```

---

## 4. Operational Dashboard Endpoints

### `GET /api/dashboard/summary`
*(Coordinator Only)* Returns live aggregate operational counts:
- `total_active_requests`
- `critical_awaiting_review`
- `unassigned_requests`
- `responders_available`
- `assistance_provided`
- `awaiting_verification`

### `GET /api/dashboard/analytics`
*(Coordinator Only)* Returns breakdown metrics across status, hazard types, and priority bands.

### `GET /api/dashboard/activity`
*(Coordinator Only)* Returns recent operational activity timeline.

---

## 5. Offline Synchronization Endpoints

### `GET /api/sync/status`
Health and connectivity probe.
- **Response** (`200 OK`):
  ```json
  {
    "online": true,
    "server_time": "2026-10-27T18:00:00Z",
    "system_status": "OPERATIONAL"
  }
  ```

### `POST /api/sync/requests`
Batch endpoint for queued offline requests. Guarantees idempotency.
- **Request Body**:
  ```json
  {
    "items": [
      {
        "title": "Offline Request 1",
        "incident_type": "Flood",
        "description": "Stored offline in IndexedDB during network failure",
        "location_name": "Grid 2B",
        "people_affected": 2,
        "people_urgent": 1,
        "assistance_category": "Rescue",
        "is_immediate_threat": true,
        "idempotency_key": "uuid-v4-key",
        "client_local_id": "offline-client-local-1"
      }
    ]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "total_received": 1,
    "successful_count": 1,
    "results": [
      {
        "client_local_id": "offline-client-local-1",
        "server_request_id": 18,
        "tracking_code": "REQ-0018",
        "idempotency_key": "uuid-v4-key",
        "status": "CREATED",
        "error": null
      }
    ]
  }
  ```

---

## 6. System Health

### `GET /api/health`
Probes database connectivity and returns platform disclaimer notice.
