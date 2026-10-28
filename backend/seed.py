import json
import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.responder import ResponderProfile, ResponderAvailability
from app.models.request import AssistanceRequest, RequestStatus, PriorityBand, IncidentType, AssistanceCategory
from app.models.assignment import Assignment, AssignmentStatus
from app.models.status_history import StatusHistory
from app.models.notification import Notification, NotificationType
from app.models.audit_log import AuditLog
from app.services.priority_engine import priority_engine

def seed_database(reset: bool = True):
    print("Initializing database schema...")
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        print("Seeding synthetic users and demo accounts...")
        # 1. Coordinator
        coord_user = User(
            email="coordinator@resqnet.org",
            full_name="Chief Elena Vance (Incident Commander)",
            hashed_password=hash_password("ResqnetCoord#2026"),
            role=UserRole.COORDINATOR,
            phone="+1 (555) 019-2831",
            is_active=True
        )
        db.add(coord_user)

        # 2. Responders
        responder_data = [
            {
                "email": "sar.alpha@resqnet.org",
                "name": "Capt. Marcus Vance",
                "team": "Rapid Search & Rescue Alpha",
                "categories": ["Rescue", "Evacuation support"],
                "max": 3,
                "availability": ResponderAvailability.AVAILABLE,
                "lat": 25.7820,
                "lng": -80.1980
            },
            {
                "email": "medic.delta@resqnet.org",
                "name": "Dr. Sarah Lin (EMT lead)",
                "team": "Disaster Medical Triage Unit Delta",
                "categories": ["Medical assistance", "Rescue"],
                "max": 4,
                "availability": ResponderAvailability.AVAILABLE,
                "lat": 25.7910,
                "lng": -80.2100
            },
            {
                "email": "water.bravo@resqnet.org",
                "name": "Lt. Carlos Mendez",
                "team": "Flood Boat Squadron Bravo",
                "categories": ["Rescue", "Food and water"],
                "max": 3,
                "availability": ResponderAvailability.AVAILABLE,
                "lat": 25.7650,
                "lng": -80.1920
            },
            {
                "email": "logistics.gamma@resqnet.org",
                "name": "Sgt. Tanya Kowalski",
                "team": "Essential Supplies Relief Gamma",
                "categories": ["Food and water", "Essential supplies"],
                "max": 5,
                "availability": ResponderAvailability.AVAILABLE,
                "lat": 25.8050,
                "lng": -80.2250
            },
            {
                "email": "shelter.echo@resqnet.org",
                "name": "Director David Park",
                "team": "Emergency Temporary Shelter Echo",
                "categories": ["Shelter", "Evacuation support"],
                "max": 4,
                "availability": ResponderAvailability.BUSY,
                "lat": 25.7730,
                "lng": -80.2310
            },
            {
                "email": "evac.foxtrot@resqnet.org",
                "name": "Warrant Officer Liam O'Connor",
                "team": "Heavy Vehicle Evacuation Foxtrot",
                "categories": ["Evacuation support", "Essential supplies"],
                "max": 3,
                "availability": ResponderAvailability.OFF_DUTY,
                "lat": 25.7580,
                "lng": -80.2050
            },
        ]

        responder_users = []
        responder_profiles = []

        for r in responder_data:
            u = User(
                email=r["email"],
                full_name=r["name"],
                hashed_password=hash_password("Responder#2026"),
                role=UserRole.RESPONDER,
                phone="+1 (555) 014-9921",
                is_active=True
            )
            db.add(u)
            db.flush()
            responder_users.append(u)

            p = ResponderProfile(
                user_id=u.id,
                team=r["team"],
                supported_categories=json.dumps(r["categories"]),
                max_concurrent_assignments=r["max"],
                current_assignment_count=0,
                availability=r["availability"],
                latitude=r["lat"],
                longitude=r["lng"],
                last_active_at=datetime.datetime.utcnow()
            )
            db.add(p)
            db.flush()
            responder_profiles.append(p)

        # 3. Citizens
        citizens_data = [
            ("citizen.marina@example.com", "Marina Santos", "+1 (555) 321-4567"),
            ("citizen.robert@example.com", "Robert Chen", "+1 (555) 432-8765"),
            ("citizen.elena@example.com", "Elena Rostova", "+1 (555) 654-9870"),
        ]
        citizens = []
        for c_email, c_name, c_phone in citizens_data:
            c = User(
                email=c_email,
                full_name=c_name,
                hashed_password=hash_password("Citizen#2026"),
                role=UserRole.CITIZEN,
                phone=c_phone,
                is_active=True
            )
            db.add(c)
            db.flush()
            citizens.append(c)

        print("Seeding synthetic assistance requests with priority scoring...")
        # 16 Diverse Synthetic Incidents
        raw_requests = [
            {
                "title": "Family trapped on 2nd floor balcony in surging flood waters",
                "type": IncidentType.FLOOD,
                "category": AssistanceCategory.RESCUE,
                "desc": "Water levels reached 6 feet on the ground floor. 4 family members including an elderly grandmother on oxygen. Current is strong.",
                "location": "North Riverside Dr, Sector 3B, Canal Basin",
                "lat": 25.7892,
                "lng": -80.2014,
                "affected": 4,
                "urgent": 2,
                "threat": True,
                "med": True,
                "vuln": True,
                "ess": True,
                "contact_method": "Phone",
                "contact": "+1 (555) 902-1144",
                "notes": "Elderly grandmother requires supplemental oxygen cylinder.",
                "citizen_idx": 0,
                "status": RequestStatus.ASSIGNED,
                "assigned_profile_idx": 0,  # Rapid Search & Rescue Alpha
            },
            {
                "title": "Severe crush injury from collapsed timber beam after storm wind",
                "type": IncidentType.STORM,
                "category": AssistanceCategory.MEDICAL,
                "desc": "Heavy branch tore through roof. Individual has open fracture on lower leg with bleeding controlled by makeshift tourniquet. Conscious but shock setting in.",
                "location": "Pine Ridge Road near Maple Blvd intersection",
                "lat": 25.7950,
                "lng": -80.2180,
                "affected": 2,
                "urgent": 1,
                "threat": True,
                "med": True,
                "vuln": False,
                "ess": False,
                "contact_method": "SMS",
                "contact": "+1 (555) 881-2091",
                "notes": "Needs emergency trauma triage kit and stretcher transfer.",
                "citizen_idx": 1,
                "status": RequestStatus.EN_ROUTE,
                "assigned_profile_idx": 1,  # Medical Delta
            },
            {
                "title": "Senior living home backup generator submerged; power lost",
                "type": IncidentType.FLOOD,
                "category": AssistanceCategory.EVACUATION,
                "desc": "Basement flooded completely, halting diesel generator. 12 residents on upper floor without lights or air filtration. 3 residents use mobility walkers.",
                "location": "Shady Oaks Care Facility, 442 Elm Terrace",
                "lat": 25.7712,
                "lng": -80.2145,
                "affected": 12,
                "urgent": 3,
                "threat": False,
                "med": True,
                "vuln": True,
                "ess": True,
                "contact_method": "In-Person",
                "contact": "Nurse station desk staff on 2nd floor",
                "notes": "Wheelchair ramp flooded; requires stair-chair evacuation.",
                "citizen_idx": None,
                "status": RequestStatus.VERIFIED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Flash brush fire approaching residential cul-de-sac",
                "type": IncidentType.FIRE,
                "category": AssistanceCategory.EVACUATION,
                "desc": "High wind pushing smoke and ember wall within 300 meters of homes. Road blocked by fallen electrical lines. 6 families gathering at corner.",
                "location": "Canyon Creek Loop, East Ridge Heights",
                "lat": 25.8120,
                "lng": -80.2390,
                "affected": 18,
                "urgent": 6,
                "threat": True,
                "med": False,
                "vuln": True,
                "ess": True,
                "contact_method": "Phone",
                "contact": "+1 (555) 773-4411",
                "notes": "Several infants and domestic pets present with residents.",
                "citizen_idx": 2,
                "status": RequestStatus.RECEIVED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Clean drinking water needed for infant formula after main breach",
                "type": IncidentType.STORM,
                "category": AssistanceCategory.FOOD_WATER,
                "desc": "Municipal tap water contaminated with brown runoff. Family has 3-month-old infant and exhausted all bottled sterile water supplies.",
                "location": "Bayview Apartments, Unit 304, Harbor District",
                "lat": 25.7601,
                "lng": -80.1895,
                "affected": 3,
                "urgent": 1,
                "threat": False,
                "med": False,
                "vuln": True,
                "ess": True,
                "contact_method": "SMS",
                "contact": "+1 (555) 302-9901",
                "notes": "Needs sterile bottled water and ready-to-feed formula.",
                "citizen_idx": 0,
                "status": RequestStatus.ASSISTANCE_PROVIDED,
                "assigned_profile_idx": 3,  # Supplies Gamma
            },
            {
                "title": "Structural wall crack following magnitude 4.8 tremor",
                "type": IncidentType.EARTHQUAKE,
                "category": AssistanceCategory.SHELTER,
                "desc": "Diagonal shear crack across exterior masonry wall. Residents evacuated to yard in freezing drizzle. Need emergency tarp or temporary shelter.",
                "location": "819 Westward Ave, Westgate District",
                "lat": 25.7680,
                "lng": -80.2280,
                "affected": 5,
                "urgent": 0,
                "threat": False,
                "med": False,
                "vuln": True,
                "ess": True,
                "contact_method": "Phone",
                "contact": "+1 (555) 601-2244",
                "notes": "Family staying inside vehicle; requires thermal blankets.",
                "citizen_idx": 1,
                "status": RequestStatus.CLOSED,
                "assigned_profile_idx": 4,  # Shelter Echo
            },
            {
                "title": "Isolated hillside road washout; elderly couple stranded",
                "type": IncidentType.LANDSLIDE,
                "category": AssistanceCategory.RESCUE,
                "desc": "Mudslide swept away 40 yards of asphalt driveway. No vehicle access. Couple safe in cabin but only 2 days of cardiac medication remaining.",
                "location": "Timberline Cutoff, Mile Marker 4.2",
                "lat": 25.8240,
                "lng": -80.2510,
                "affected": 2,
                "urgent": 1,
                "threat": False,
                "med": True,
                "vuln": True,
                "ess": False,
                "contact_method": "Radio",
                "contact": "VHF Channel 16 / CB Channel 9",
                "notes": "Metoprolol and Lisinopril medication delivery required.",
                "citizen_idx": None,
                "status": RequestStatus.RECEIVED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Asthma patient with failing nebulizer in smoke plume",
                "type": IncidentType.FIRE,
                "category": AssistanceCategory.MEDICAL,
                "desc": "Dense wildfire smoke settled in valley. 14-year-old having severe breathing distress. Inhaler empty, electric nebulizer has no power.",
                "location": "Crestview Mobile Home Park, Lot 22",
                "lat": 25.8080,
                "lng": -80.2150,
                "affected": 2,
                "urgent": 1,
                "threat": True,
                "med": True,
                "vuln": True,
                "ess": False,
                "contact_method": "Phone",
                "contact": "+1 (555) 919-8321",
                "notes": "Albuterol sulfate dosage and oxygen administration required.",
                "citizen_idx": 2,
                "status": RequestStatus.VERIFIED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Stranded motorists in flooded underpass",
                "type": IncidentType.FLOOD,
                "category": AssistanceCategory.RESCUE,
                "desc": "Two passenger cars caught in sudden drainage surge under railway bridge. Water up to window sills. Drivers perched on car hoods.",
                "location": "Industrial Blvd railway underpass",
                "lat": 25.7780,
                "lng": -80.2030,
                "affected": 3,
                "urgent": 2,
                "threat": True,
                "med": False,
                "vuln": False,
                "ess": False,
                "contact_method": "Phone",
                "contact": "+1 (555) 443-1289",
                "notes": "Water depth estimated 4 feet; rescue boat or high-water truck needed.",
                "citizen_idx": None,
                "status": RequestStatus.ASSIGNED,
                "assigned_profile_idx": 2,  # Boat Squadron Bravo
            },
            {
                "title": "Roof shingles torn off, torrential rain entering bedrooms",
                "type": IncidentType.STORM,
                "category": AssistanceCategory.ESSENTIAL_SUPPLIES,
                "desc": "Gale wind stripped roof deck over two bedrooms. Ceiling drywall sagging from water weight. Need heavy duty vinyl tarps and sandbags.",
                "location": "1204 Coral Way, Coral Gables border",
                "lat": 25.7505,
                "lng": -80.2120,
                "affected": 4,
                "urgent": 0,
                "threat": False,
                "med": False,
                "vuln": False,
                "ess": True,
                "contact_method": "Phone",
                "contact": "+1 (555) 234-9081",
                "notes": "Property accessible by standard vehicle on paved road.",
                "citizen_idx": 0,
                "status": RequestStatus.RECEIVED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Community food bank storage lost refrigeration",
                "type": IncidentType.STORM,
                "category": AssistanceCategory.FOOD_WATER,
                "desc": "Grid outage for 18 hours. Perishable dairy and prepared meals for 80 families will spoil in 6 hours without dry ice or mobile generator.",
                "location": "Grace Fellowship Community Center, 700 Lincoln Rd",
                "lat": 25.7870,
                "lng": -80.1850,
                "affected": 80,
                "urgent": 0,
                "threat": False,
                "med": False,
                "vuln": True,
                "ess": True,
                "contact_method": "Phone",
                "contact": "+1 (555) 789-0123",
                "notes": "Loading dock has standard 3-phase plug hookup available.",
                "citizen_idx": 1,
                "status": RequestStatus.VERIFIED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Dialysis patient scheduled treatment unreachable due to debris",
                "type": IncidentType.MEDICAL,
                "category": AssistanceCategory.MEDICAL,
                "desc": "72-year-old end-stage renal patient missed dialysis due to fallen oaks blocking driveway. Showing signs of fluid retention and shortness of breath.",
                "location": "450 Magnolia Lane, Southern Suburbs",
                "lat": 25.7420,
                "lng": -80.2200,
                "affected": 1,
                "urgent": 1,
                "threat": True,
                "med": True,
                "vuln": True,
                "ess": False,
                "contact_method": "Phone",
                "contact": "+1 (555) 555-8910",
                "notes": "Scheduled at Northside Nephrology Center.",
                "citizen_idx": 2,
                "status": RequestStatus.RECEIVED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Basement retaining wall collapse threat after heavy rain",
                "type": IncidentType.LANDSLIDE,
                "category": AssistanceCategory.SHELTER,
                "desc": "Earthen bank behind townhouse bulging. Mud leaking through foundation ventilation grates. Building manager recommends evacuation.",
                "location": "Terrace Green Condos, Bldg 4, Hillcrest Ward",
                "lat": 25.8180,
                "lng": -80.2440,
                "affected": 8,
                "urgent": 1,
                "threat": False,
                "med": False,
                "vuln": False,
                "ess": True,
                "contact_method": "SMS",
                "contact": "+1 (555) 612-4455",
                "notes": "Red Cross shelter voucher or temporary shelter spot needed.",
                "citizen_idx": None,
                "status": RequestStatus.RECEIVED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Minor property inspection request (Duplicate non-emergency)",
                "type": IncidentType.OTHER,
                "category": AssistanceCategory.OTHER,
                "desc": "Checking if pool enclosure screen has small tear. No people trapped, no danger.",
                "location": "301 Ocean View Blvd, Key Point",
                "lat": 25.7350,
                "lng": -80.1700,
                "affected": 1,
                "urgent": 0,
                "threat": False,
                "med": False,
                "vuln": False,
                "ess": False,
                "contact_method": "Phone",
                "contact": "+1 (555) 111-2233",
                "notes": "Non-emergency residential maintenance inquiry.",
                "citizen_idx": 0,
                "status": RequestStatus.REJECTED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Citizen voluntarily relocated with relatives (Cancelled)",
                "type": IncidentType.FLOOD,
                "category": AssistanceCategory.EVACUATION,
                "desc": "Originally requested sandbags for driveway; neighbour assisted with pickup truck and family left for safe shelter in inland county.",
                "location": "884 Palmetto Ave",
                "lat": 25.7610,
                "lng": -80.2350,
                "affected": 2,
                "urgent": 0,
                "threat": False,
                "med": False,
                "vuln": False,
                "ess": False,
                "contact_method": "Phone",
                "contact": "+1 (555) 777-9988",
                "notes": "Self-evacuated safely.",
                "citizen_idx": 1,
                "status": RequestStatus.CANCELLED,
                "assigned_profile_idx": None,
            },
            {
                "title": "Diabetic insulin supply spoiled during 24h brownout",
                "type": IncidentType.STORM,
                "category": AssistanceCategory.ESSENTIAL_SUPPLIES,
                "desc": "Type 1 diabetic with 1 vial remaining. Current ambient temperature inside apartment is 86F. Needs chilled cold pack and replacement Humalog.",
                "location": "220 Biscayne Blvd, Apt 14B",
                "lat": 25.7760,
                "lng": -80.1900,
                "affected": 1,
                "urgent": 1,
                "threat": False,
                "med": True,
                "vuln": True,
                "ess": True,
                "contact_method": "Phone",
                "contact": "+1 (555) 998-1245",
                "notes": "Requires insulated cold storage pouch and prescription verification.",
                "citizen_idx": 2,
                "status": RequestStatus.ASSIGNED,
                "assigned_profile_idx": 1,  # Medical Delta
            }
        ]

        created_requests = []
        for idx, r_data in enumerate(raw_requests, start=1):
            created_time = datetime.datetime.utcnow() - datetime.timedelta(hours=(len(raw_requests) - idx) * 2 + 1)
            
            p_res = priority_engine.calculate(
                is_immediate_threat=r_data["threat"],
                is_medical_emergency=r_data["med"],
                people_urgent=r_data["urgent"],
                is_vulnerable_present=r_data["vuln"],
                is_essential_unavailable=r_data["ess"],
                created_at=created_time,
                now=datetime.datetime.utcnow()
            )

            citizen_user = citizens[r_data["citizen_idx"]] if r_data["citizen_idx"] is not None else None

            req = AssistanceRequest(
                tracking_code=f"REQ-{idx:04d}",
                citizen_id=citizen_user.id if citizen_user else None,
                title=r_data["title"],
                incident_type=r_data["type"],
                description=r_data["desc"],
                location_name=r_data["location"],
                latitude=r_data["lat"],
                longitude=r_data["lng"],
                people_affected=r_data["affected"],
                people_urgent=r_data["urgent"],
                assistance_category=r_data["category"],
                is_immediate_threat=r_data["threat"],
                is_medical_emergency=r_data["med"],
                is_vulnerable_present=r_data["vuln"],
                is_essential_unavailable=r_data["ess"],
                safe_contact_method=r_data["contact_method"],
                contact_details=r_data["contact"],
                accessibility_medical_notes=r_data["notes"],
                status=r_data["status"],
                calculated_priority_score=p_res.total_score,
                priority_band=p_res.priority_band,
                priority_factors_json=json.dumps([f.model_dump() for f in p_res.factors]),
                priority_explanation=p_res.explanation,
                priority_calculated_at=created_time,
                idempotency_key=f"seed-req-{idx}",
                created_at=created_time,
                updated_at=datetime.datetime.utcnow()
            )

            # Extra coordinator verification notes for verified/assigned items
            if r_data["status"] in [RequestStatus.VERIFIED, RequestStatus.ASSIGNED, RequestStatus.EN_ROUTE, RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.CLOSED]:
                req.verification_notes = "Verified by coordinator triage desk via telephonic callback."
                req.verified_by_user_id = coord_user.id
                req.verified_at = created_time + datetime.timedelta(minutes=15)

            if r_data["status"] == RequestStatus.REJECTED:
                req.verification_notes = "Rejected: Non-emergency residential maintenance query."
                req.verified_by_user_id = coord_user.id
                req.verified_at = created_time + datetime.timedelta(minutes=10)

            db.add(req)
            db.flush()
            created_requests.append(req)

            # Add initial status history
            hist1 = StatusHistory(
                request_id=req.id,
                previous_status=None,
                new_status=RequestStatus.RECEIVED,
                changed_by_user_id=citizen_user.id if citizen_user else None,
                explanation="Request submitted to RESQNET triage network.",
                timestamp=created_time
            )
            db.add(hist1)

            # Add assignment and progressive status histories
            if r_data["assigned_profile_idx"] is not None:
                prof = responder_profiles[r_data["assigned_profile_idx"]]
                assigned_time = created_time + datetime.timedelta(minutes=25)
                
                assignment = Assignment(
                    request_id=req.id,
                    responder_id=prof.id,
                    assigned_by_user_id=coord_user.id,
                    status=AssignmentStatus.ASSIGNED,
                    assigned_at=assigned_time,
                )

                if r_data["status"] in [RequestStatus.EN_ROUTE, RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.CLOSED]:
                    assignment.status = AssignmentStatus.ACCEPTED
                    assignment.accepted_at = assigned_time + datetime.timedelta(minutes=10)

                if r_data["status"] in [RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.CLOSED]:
                    assignment.status = AssignmentStatus.COMPLETED
                    assignment.completed_at = assigned_time + datetime.timedelta(minutes=45)
                    assignment.assistance_notes = "Provided critical field assistance, stabilization, and handover."

                db.add(assignment)

                # Update responder workload
                if assignment.status in [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]:
                    prof.current_assignment_count += 1
                    if prof.current_assignment_count >= prof.max_concurrent_assignments:
                        prof.availability = ResponderAvailability.BUSY

                # Status histories for workflow steps
                hist_verify = StatusHistory(
                    request_id=req.id,
                    previous_status=RequestStatus.RECEIVED,
                    new_status=RequestStatus.VERIFIED,
                    changed_by_user_id=coord_user.id,
                    explanation="Contact details and urgent requirements confirmed.",
                    timestamp=created_time + datetime.timedelta(minutes=15)
                )
                db.add(hist_verify)

                hist_assign = StatusHistory(
                    request_id=req.id,
                    previous_status=RequestStatus.VERIFIED,
                    new_status=RequestStatus.ASSIGNED,
                    changed_by_user_id=coord_user.id,
                    explanation=f"Assigned to {prof.team}.",
                    timestamp=assigned_time
                )
                db.add(hist_assign)

                if r_data["status"] in [RequestStatus.EN_ROUTE, RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.CLOSED]:
                    hist_enroute = StatusHistory(
                        request_id=req.id,
                        previous_status=RequestStatus.ASSIGNED,
                        new_status=RequestStatus.EN_ROUTE,
                        changed_by_user_id=prof.user_id,
                        explanation=f"{prof.team} unit deployed and moving to location.",
                        timestamp=assigned_time + datetime.timedelta(minutes=10)
                    )
                    db.add(hist_enroute)

                if r_data["status"] in [RequestStatus.ASSISTANCE_PROVIDED, RequestStatus.CLOSED]:
                    hist_prov = StatusHistory(
                        request_id=req.id,
                        previous_status=RequestStatus.EN_ROUTE,
                        new_status=RequestStatus.ASSISTANCE_PROVIDED,
                        changed_by_user_id=prof.user_id,
                        explanation=f"Field assistance successfully rendered by {prof.team}.",
                        timestamp=assigned_time + datetime.timedelta(minutes=45)
                    )
                    db.add(hist_prov)

                if r_data["status"] == RequestStatus.CLOSED:
                    hist_closed = StatusHistory(
                        request_id=req.id,
                        previous_status=RequestStatus.ASSISTANCE_PROVIDED,
                        new_status=RequestStatus.CLOSED,
                        changed_by_user_id=coord_user.id,
                        explanation="Case audited and resolved in incident management ledger.",
                        timestamp=assigned_time + datetime.timedelta(minutes=60)
                    )
                    db.add(hist_closed)

        print("Seeding synthetic operational notifications...")
        notifications = [
            Notification(
                target_role="COORDINATOR",
                title="Critical Priority Alert [REQ-0001]",
                message="High surge flood entrapment reported in Sector 3B. Score: 85/100.",
                notification_type=NotificationType.CRITICAL_TRIAGE,
                request_id=1,
                is_read=False,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=40)
            ),
            Notification(
                target_role="COORDINATOR",
                title="Wildfire Evacuation Alert [REQ-0004]",
                message="Approaching brush fire threatens Canyon Creek cul-de-sac. 18 affected.",
                notification_type=NotificationType.CRITICAL_TRIAGE,
                request_id=4,
                is_read=False,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
            ),
            Notification(
                user_id=responder_users[0].id,
                title="New Unit Assignment [REQ-0001]",
                message="Rapid Search & Rescue Alpha assigned to balcony entrapment case REQ-0001.",
                notification_type=NotificationType.ASSIGNMENT,
                request_id=1,
                is_read=False,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=25)
            ),
            Notification(
                user_id=citizens[0].id,
                title="Assistance Provided [REQ-0005]",
                message="Essential Supplies Relief Gamma delivered sterile infant water formula.",
                notification_type=NotificationType.STATUS_CHANGE,
                request_id=5,
                is_read=True,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
            ),
        ]
        db.add_all(notifications)

        print("Seeding coordinator audit log entries...")
        audit_entries = [
            AuditLog(
                user_id=coord_user.id,
                action="INITIAL_INCIDENT_COORDINATION_BOOTSTRAP",
                entity_type="IncidentSystem",
                entity_id=1,
                details_json=json.dumps({"incident_zone": "Coastal Storm and Flood Sector A", "severity": "Level 3"}),
                ip_address="127.0.0.1",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
            ),
            AuditLog(
                user_id=coord_user.id,
                action="ASSIGNMENT_CREATED",
                entity_type="Assignment",
                entity_id=1,
                details_json=json.dumps({"request_id": 1, "unit": "Rapid Search & Rescue Alpha"}),
                ip_address="127.0.0.1",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(minutes=25)
            ),
        ]
        db.add_all(audit_entries)

        db.commit()
        print(f"Successfully seeded database with {len(created_requests)} requests, {len(responder_profiles)} responder units, 3 citizens, and 1 incident coordinator.")
    except Exception as ex:
        db.rollback()
        print(f"Error seeding database: {ex}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database(reset=True)
