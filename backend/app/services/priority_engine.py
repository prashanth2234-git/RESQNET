import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

class PriorityFactor(BaseModel):
    key: str
    name: str
    points: int
    applied: bool
    explanation: str

class PriorityResult(BaseModel):
    total_score: int
    priority_band: str
    factors: List[PriorityFactor]
    explanation: str
    calculated_at: str

class PriorityConfig:
    # Configurable weights
    IMMEDIATE_THREAT_POINTS: int = 35
    URGENT_MEDICAL_POINTS: int = 25
    MULTIPLE_URGENT_PEOPLE_POINTS: int = 15
    SINGLE_URGENT_PERSON_POINTS: int = 8
    VULNERABLE_PEOPLE_POINTS: int = 10
    ESSENTIAL_UNAVAILABLE_POINTS: int = 10
    WAITING_HOURLY_INCREMENT: int = 1
    MAX_WAITING_POINTS: int = 5

    # Configurable priority band thresholds
    CRITICAL_THRESHOLD: int = 75
    HIGH_THRESHOLD: int = 50
    MEDIUM_THRESHOLD: int = 25

class PriorityEngine:
    def __init__(self, config: Optional[PriorityConfig] = None):
        self.config = config or PriorityConfig()

    def get_band(self, score: int) -> str:
        if score >= self.config.CRITICAL_THRESHOLD:
            return "CRITICAL"
        if score >= self.config.HIGH_THRESHOLD:
            return "HIGH"
        if score >= self.config.MEDIUM_THRESHOLD:
            return "MEDIUM"
        return "LOW"

    def calculate(
        self,
        is_immediate_threat: bool,
        is_medical_emergency: bool,
        people_urgent: int,
        is_vulnerable_present: bool,
        is_essential_unavailable: bool,
        created_at: Optional[datetime.datetime] = None,
        now: Optional[datetime.datetime] = None,
    ) -> PriorityResult:
        factors: List[PriorityFactor] = []
        score = 0
        now = now or datetime.datetime.utcnow()

        # 1. Immediate threat to life
        if is_immediate_threat:
            score += self.config.IMMEDIATE_THREAT_POINTS
            factors.append(PriorityFactor(
                key="immediate_threat",
                name="Immediate Threat to Life",
                points=self.config.IMMEDIATE_THREAT_POINTS,
                applied=True,
                explanation="Active hazard posing immediate danger to life or physical safety."
            ))
        else:
            factors.append(PriorityFactor(
                key="immediate_threat",
                name="Immediate Threat to Life",
                points=0,
                applied=False,
                explanation="No active immediate threat to life reported."
            ))

        # 2. Urgent medical emergency
        if is_medical_emergency:
            score += self.config.URGENT_MEDICAL_POINTS
            factors.append(PriorityFactor(
                key="medical_emergency",
                name="Urgent Medical Emergency",
                points=self.config.URGENT_MEDICAL_POINTS,
                applied=True,
                explanation="Severe injury, acute illness, or critical medical equipment failure."
            ))
        else:
            factors.append(PriorityFactor(
                key="medical_emergency",
                name="Urgent Medical Emergency",
                points=0,
                applied=False,
                explanation="No acute medical emergency indicated."
            ))

        # 3. People requiring immediate assistance
        if people_urgent >= 2:
            score += self.config.MULTIPLE_URGENT_PEOPLE_POINTS
            factors.append(PriorityFactor(
                key="multiple_urgent_people",
                name="Multiple People in Immediate Need",
                points=self.config.MULTIPLE_URGENT_PEOPLE_POINTS,
                applied=True,
                explanation=f"{people_urgent} individuals require urgent intervention."
            ))
        elif people_urgent == 1:
            score += self.config.SINGLE_URGENT_PERSON_POINTS
            factors.append(PriorityFactor(
                key="single_urgent_person",
                name="Individual in Urgent Need",
                points=self.config.SINGLE_URGENT_PERSON_POINTS,
                applied=True,
                explanation="1 person reported in urgent need of assistance."
            ))
        else:
            factors.append(PriorityFactor(
                key="people_urgent",
                name="People Requiring Urgent Help",
                points=0,
                applied=False,
                explanation="No persons currently marked as requiring urgent immediate help."
            ))

        # 4. Vulnerable individuals affected
        if is_vulnerable_present:
            score += self.config.VULNERABLE_PEOPLE_POINTS
            factors.append(PriorityFactor(
                key="vulnerable_present",
                name="Vulnerable Individuals Present",
                points=self.config.VULNERABLE_PEOPLE_POINTS,
                applied=True,
                explanation="Elderly, infants, mobility-impaired, or medical-dependent individuals present."
            ))
        else:
            factors.append(PriorityFactor(
                key="vulnerable_present",
                name="Vulnerable Individuals Present",
                points=0,
                applied=False,
                explanation="No specific vulnerable demographic indicators reported."
            ))

        # 5. Essential supplies/resources unavailable
        if is_essential_unavailable:
            score += self.config.ESSENTIAL_UNAVAILABLE_POINTS
            factors.append(PriorityFactor(
                key="essential_unavailable",
                name="Essential Resources Unavailable",
                points=self.config.ESSENTIAL_UNAVAILABLE_POINTS,
                applied=True,
                explanation="Lacks clean potable water, vital medications, shelter, or heating."
            ))
        else:
            factors.append(PriorityFactor(
                key="essential_unavailable",
                name="Essential Resources Unavailable",
                points=0,
                applied=False,
                explanation="Basic life-sustaining essentials currently available or not reported absent."
            ))

        # 6. Waiting time adjustment
        waiting_points = 0
        if created_at is not None:
            delta = now - created_at
            hours_waiting = max(0, int(delta.total_seconds() // 3600))
            waiting_points = min(hours_waiting * self.config.WAITING_HOURLY_INCREMENT, self.config.MAX_WAITING_POINTS)

        if waiting_points > 0:
            score += waiting_points
            factors.append(PriorityFactor(
                key="waiting_time",
                name="Waiting Time Adjustment",
                points=waiting_points,
                applied=True,
                explanation=f"Added +{waiting_points} point(s) based on elapsed waiting time in triage queue."
            ))
        else:
            factors.append(PriorityFactor(
                key="waiting_time",
                name="Waiting Time Adjustment",
                points=0,
                applied=False,
                explanation="Standard triage queue time (no waiting adjustment applied)."
            ))

        # Clamp between 0 and 100
        clamped_score = max(0, min(100, score))
        band = self.get_band(clamped_score)

        # Generate human-readable explanation
        applied_names = [f"{f.name} (+{f.points})" for f in factors if f.applied]
        if applied_names:
            explanation = f"Calculated as {band} priority ({clamped_score}/100) due to: " + ", ".join(applied_names) + "."
        else:
            explanation = f"Calculated as {band} priority ({clamped_score}/100). Baseline routine request with no acute threat indicators reported."

        return PriorityResult(
            total_score=clamped_score,
            priority_band=band,
            factors=factors,
            explanation=explanation,
            calculated_at=now.isoformat() + "Z"
        )

# Global default instance
priority_engine = PriorityEngine()
