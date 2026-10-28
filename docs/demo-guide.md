# RESQNET Demonstration & Evaluation Guide

**Problem Statement ID**: HACK-P437  
**System**: RESQNET — Intelligent Disaster Response and Coordination Platform  

---

## 1. Demo User Accounts & Credentials

The system includes pre-seeded synthetic test accounts across all 3 roles. On the login screen (`/login`), you can click any of the **1-Click Demo Buttons** to instantly populate credentials:

| Role | Name & Team | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **COORDINATOR** | Chief Elena Vance *(Incident Commander)* | `coordinator@resqnet.org` | `ResqnetCoord#2026` | Full command desk, triage, priority overrides, responder dispatch, workload governance, analytics |
| **RESPONDER** | Capt. Marcus Vance *(Rapid Search & Rescue Alpha)* | `sar.alpha@resqnet.org` | `Responder#2026` | Rescue, evacuation support, mission acceptance, field handover notes |
| **RESPONDER** | Dr. Sarah Lin *(Disaster Medical Unit Delta)* | `medic.delta@resqnet.org` | `Responder#2026` | Acute trauma, emergency first aid, medical triage |
| **CITIZEN** | Marina Santos *(Affected Resident)* | `citizen.marina@example.com` | `Citizen#2026` | Request submission, status tracking, permitted contact updates |

> **DEVELOPMENT NOTE**: All accounts, incidents, and phone numbers are synthetic test artifacts created for demonstration purposes.

---

## 2. Step-by-Step Judge Demonstration Script

### Act 1: Citizen Experience & Explainable Priority Calculation
1. Open the homepage at `http://127.0.0.1:5173/`.
2. Notice the prominent **Emergency Prototype Limitation Notice** displayed on all pages.
3. Click **"Submit Assistance Request"** (or visit `/request`).
4. Fill in the incident form:
   - Hazard: **Flood**
   - Title: `Water rising over ground-floor windows, elderly resident trapped`
   - Description: `Current is rapid, water reached 6 feet, family on 2nd floor.`
   - Location: `812 Canal View Terrace, Sector 3`
   - Total People: `4`, Requiring Immediate Help: `2`
   - Category: `Rescue`
   - Check **"Immediate Threat to Life"** (+35 pts)
   - Check **"Acute Medical Emergency"** (+25 pts)
   - Check **"Vulnerable People Present"** (+10 pts)
   - Check **"Essential Resources Unavailable"** (+10 pts)
5. Click **"Submit Assistance Request"**.
6. View the **Confirmation Screen**:
   - Notice the unique tracking code generated (e.g. `REQ-0017`).
   - Notice the calculated priority score of **95/100 (CRITICAL)**.
   - Click **"View Live Case Status"** to inspect the chronological timeline.

---

### Act 2: Coordinator Command Center & Transparent Triage
1. Click **"Sign In"** in the top navigation (or visit `/login`).
2. Click the 1-click button for **"Incident Coordinator"** (`coordinator@resqnet.org`) and log in.
3. You are redirected to the **Command Center** (`/coordinator`):
   - Notice the 6 summary metric cards: *Total Active*, *Critical Review*, *Unassigned*, *Available Units*, *Assisted Cases*, *Pending Triage*.
   - Examine the live Recharts visualizations (*Incident Status Breakdown* and *Priority Band Distribution*).
   - In the **High-Priority Incidents Requiring Dispatch** list, click **"Triage & Assign"** on the case you just submitted (`REQ-0017`).
4. On the Triage Workbench (`/coordinator/requests/:id`):
   - Review the **Explainable Priority Assessment** card. It details every factor (Immediate threat +35, Medical emergency +25, Multiple urgent +15, Vulnerable +10, Essential supplies +10).
   - Click **"Verify Incident"** and submit verification notes. Notice the status transitions to `VERIFIED` and creates an audit entry.
   - Click **"Override"** to test administrative override. Set score to `98`, band `CRITICAL`, and enter reason: `Secondary high-voltage power line collapsed in water`. Submit and observe that the override is recorded with author and timestamp in the audit trail.

---

### Act 3: Workload-Governed Dispatch
1. On the same Triage Workbench, click **"Assign Responder Unit"**.
2. Select **"Heavy Vehicle Evacuation Foxtrot"** (which is seeded as `OFF_DUTY`) or select a unit that is at capacity.
3. Notice the red **Workload Governance Restriction** alert: The system blocks assignment unless an explicit emergency override reason is supplied.
4. Select **"Rapid Search & Rescue Alpha"** (which is `AVAILABLE` and within capacity).
5. Click **"Dispatch Unit"**.
6. Observe that the case status immediately shifts to `ASSIGNED`, the assignment record is attached, and an in-app notification is dispatched to the unit!

---

### Act 4: Responder Field Experience
1. Click the profile icon in the top right and click **Sign Out**.
2. On `/login`, click the 1-click button for **"Search & Rescue Alpha"** (`sar.alpha@resqnet.org`) and log in.
3. You are redirected to the **Responder Unit Dashboard** (`/responder`):
   - Notice the unit availability toggle buttons (*Available*, *Busy*, *Off Duty*). Test clicking **"Busy"** and notice the live badge updates.
   - In the **Active Incident Assignments** list, locate the assigned incident.
   - Click **"Accept & En Route"**. The request status transitions to `EN_ROUTE`.
4. Click **"Field Notes & Complete"** to navigate to the Mission Detail page (`/responder/assignments/:id`):
   - View the incident target on the interactive map.
   - In the **Field Mission Handover & Completion Notes** form, enter:
     `Evacuated 4 residents via rescue dinghy to higher ground. Family stabilized.`
   - Click **"Mark Assistance as Provided & Free Unit Capacity"**.
   - Notice the case is marked complete and the unit workload is automatically decremented!

---

### Act 5: Interactive Disaster Map
1. Log back in as Coordinator (`coordinator@resqnet.org`).
2. Navigate to **"Disaster Map"** (`/coordinator/map`).
3. Notice the interactive Leaflet map with OpenStreetMap tiles:
   - Markers are color-coded by priority: Red (Critical), Amber (High), Blue (Medium), Green (Low).
   - Critical incidents pulse with animated rings.
   - Click any marker to open its popup with tracking code, priority, and link to triage.
   - Filter by hazard type (e.g. *Flood*) and notice both the map pins and side list synchronize seamlessly.
   - Click an incident in the side list to fly the map camera directly to its coordinates!

---

### Act 6: Offline-First Resilience
1. Open DevTools in your browser (F12) -> Network tab -> Check **"Offline"** (or disconnect Wi-Fi).
2. Notice the yellow **OFFLINE MODE** banner appears at the top of RESQNET.
3. Go to `/request` and fill out an incident report.
4. Click **"Submit Assistance Request"**:
   - The system detects the offline state and safely stores the request in browser **IndexedDB** (`resqnet_offline_v1`).
   - The confirmation screen confirms: **"Request Saved Offline in Queue"**.
5. Go to DevTools Network tab -> Uncheck "Offline" (restore internet).
6. Notice the green **"Connection restored"** notification and the **"Sync Now"** button appear.
7. Click **"Sync Now"**:
   - The offline request is sent to `/api/sync/requests` with its UUID idempotency key.
   - The server assigns a permanent tracking code (e.g. `REQ-0018`) and saves the request.
   - The local IndexedDB queue updates to `SYNCED` with zero duplicates!
