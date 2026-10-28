# RESQNET

## Intelligent Disaster Response & Coordination Platform
**Problem Statement ID**: HACK-P437  
**Full-Stack Implementation**: FastAPI (Python 3.11) + React 19 + TypeScript + Vite + Tailwind CSS  

---

> ### ⚠️ PROTOTYPE LIMITATION NOTICE
> **RESQNET is a demonstration prototype, not an official emergency dispatch service.**  
> Requests submitted here are not automatically transmitted to government or municipal emergency services.  
> **If you are in immediate life-threatening danger, contact your local official emergency services (Dial 911 / 112 or local emergency line).**

---

## 1. Overview & Key Capabilities

RESQNET centralizes disaster assistance requests during simulated floods, storms, wildfires, earthquakes, and landslides. It bridges affected citizens, operational coordinators, and field response units through:

1. **Dedicated Citizen Intake Form**: Supports offline caching via IndexedDB and idempotent synchronization upon network reconnection.
2. **Explainable Priority Engine**: Deterministic, mathematical 0–100 scoring based on documented hazard factors, urgent medical needs, affected populations, and queue waiting time.
3. **Coordinator Command Center**: Real-time operational dashboard with summary metric cards, Recharts data analytics, and live activity feeds.
4. **Interactive Disaster Map**: Synchronized Leaflet and OpenStreetMap geospatial visualization with priority-color-coded pulsing markers and side-panel filtering.
5. **Responder Management & Workload Governance**: Tracks responder team capacities and enforces workload limits to prevent volunteer burnout unless overridden with a documented reason.
6. **Immutable Status State Machine**: Enforces valid status transitions (`RECEIVED` → `VERIFIED` → `ASSIGNED` → `EN_ROUTE` → `ASSISTANCE_PROVIDED` → `CLOSED`), accompanied by full audit logging.
7. **In-App Real Event Notifications**: Notification center triggered by actual system events.

---

## 2. Synthetic Demo Accounts

The database comes pre-seeded with realistic, synthetic test accounts. On the Login screen (`/login`), you can use the **1-Click Demo Buttons** to instantly log in:

| Role | Name & Squad | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **COORDINATOR** | Chief Elena Vance *(Incident Commander)* | `coordinator@resqnet.org` | `ResqnetCoord#2026` | Full command desk, triage, priority overrides, responder dispatch, workload governance, analytics |
| **RESPONDER** | Capt. Marcus Vance *(Rapid Search & Rescue Alpha)* | `sar.alpha@resqnet.org` | `Responder#2026` | Rescue, evacuation support, mission acceptance, field handover notes |
| **RESPONDER** | Dr. Sarah Lin *(Disaster Medical Unit Delta)* | `medic.delta@resqnet.org` | `Responder#2026` | Acute trauma, emergency first aid, medical triage |
| **CITIZEN** | Marina Santos *(Affected Resident)* | `citizen.marina@example.com` | `Citizen#2026` | Request submission, status tracking, permitted contact updates |

*All accounts and incidents are synthetic test records.*

---

## 3. Windows PowerShell Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js v18+ and npm v9+

### Terminal 1: Backend Setup & Execution
Open Windows PowerShell in the project directory:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Seed the database with synthetic incidents, responders, and accounts
python seed.py

# Run automated tests
pytest -v

# Start the FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will be live at `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`).*

### Terminal 2: Frontend Setup & Execution
Open a second Windows PowerShell terminal in the project directory:

```powershell
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Run type check and production build verification
npm run build

# Start the Vite development server on port 5173
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend application will be live at `http://127.0.0.1:5173`.*

---

## 4. Running Automated Tests

### Backend Test Suite
The backend includes 22 automated unit and integration tests covering priority calculations, boundary conditions, password hashing, JWT authorization, workload capacity enforcement, state machine transitions, and offline idempotent sync:

```powershell
cd backend
.\venv\Scripts\pytest -v
```
Output:
```
======================= 22 passed in 5.58s ========================
```

### Frontend Build & Type Validation
The frontend is built with strict TypeScript checks:

```powershell
cd frontend
npm run build
```
Output:
```
✓ 2600 modules transformed.
✓ built in 9.84s
```

---

## 5. System Architecture

```
internal hackathon/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Routers (auth, requests, responders, dashboard, notifications, sync, health)
│   │   ├── core/            # Config, security (bcrypt & JWT), database session
│   │   ├── models/          # SQLAlchemy Models (User, Request, Responder, Assignment, StatusHistory, etc.)
│   │   ├── schemas/         # Pydantic Schemas & DTOs
│   │   ├── services/        # Business Logic (PriorityEngine, StatusWorkflow, AssignmentService, etc.)
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Pytest suite
│   ├── seed.py              # Repeatable synthetic seed script
│   ├── requirements.txt     # Backend dependencies
│   └── .env.example         # Configuration template
├── frontend/
│   ├── public/              # Service worker (sw.js), favicon.svg
│   ├── src/
│   │   ├── components/      # Common UI (Badges, Buttons, Cards, Modals) & Layout (Navbar, Footer, ProtectedRoute)
│   │   ├── context/         # AuthContext provider
│   │   ├── features/        # IndexedDB offline store & sync queue, priority breakdown component
│   │   ├── pages/           # Pages for Public, Citizen, Coordinator, and Responder personas
│   │   ├── services/        # HTTP API client services
│   │   ├── types/           # TypeScript contracts
│   │   ├── App.tsx          # Router configuration
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.md      # Detailed system architecture, formula, and state machine
│   ├── api.md               # Complete REST API reference
│   └── demo-guide.md        # Step-by-step walkthrough script for judges
├── README.md
└── .gitignore
```

---

## 6. Production Deployment Instructions

### Deploying Frontend to Vercel
1. Set root directory to `frontend`.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_API_BASE_URL`: URL of your deployed backend (e.g., `https://resqnet-api.onrender.com/api`).

### Deploying Backend to Render
1. Create a **Web Service** pointing to the repository.
2. Root Directory: `backend`.
3. Environment: **Python 3**.
4. Build Command: `pip install -r requirements.txt && python seed.py`.
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Environment Variables:
   - `ENVIRONMENT`: `production`
   - `SECRET_KEY`: A cryptographically secure random string (e.g., generated with `openssl rand -hex 32`).
   - `DATABASE_URL`: SQLite (`sqlite:///./resqnet.db`) or managed PostgreSQL (`postgresql://user:pass@host/db`).

---

## 7. Security & Operational Limitations

1. **Triage Scope**: The deterministic priority algorithm is designed for coordination ranking in prototype simulations. It is not an accredited medical triage system (such as START or triage coding).
2. **Geocoding**: Coordinates are synthetic and for operational simulation. Personal locations must never be published without victim consent.
3. **Dispatch Limitations**: RESQNET does not dispatch police, fire departments, or municipal ambulances.
