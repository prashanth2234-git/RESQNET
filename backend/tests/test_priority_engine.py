import datetime
import pytest
from app.services.priority_engine import PriorityEngine, PriorityConfig

def test_baseline_routine_score():
    engine = PriorityEngine()
    result = engine.calculate(
        is_immediate_threat=False,
        is_medical_emergency=False,
        people_urgent=0,
        is_vulnerable_present=False,
        is_essential_unavailable=False,
    )
    assert result.total_score == 0
    assert result.priority_band == "LOW"
    assert "Baseline routine request" in result.explanation

def test_immediate_threat_score():
    engine = PriorityEngine()
    result = engine.calculate(
        is_immediate_threat=True,
        is_medical_emergency=False,
        people_urgent=0,
        is_vulnerable_present=False,
        is_essential_unavailable=False,
    )
    assert result.total_score == 35
    assert result.priority_band == "MEDIUM"
    assert any(f.key == "immediate_threat" and f.applied for f in result.factors)

def test_high_priority_combination():
    engine = PriorityEngine()
    result = engine.calculate(
        is_immediate_threat=True,
        is_medical_emergency=True,
        people_urgent=0,
        is_vulnerable_present=False,
        is_essential_unavailable=False,
    )
    # 35 + 25 = 60
    assert result.total_score == 60
    assert result.priority_band == "HIGH"

def test_critical_all_factors_clamped_at_100():
    engine = PriorityEngine()
    now = datetime.datetime.utcnow()
    created_at = now - datetime.timedelta(hours=10) # 10 hours waiting
    result = engine.calculate(
        is_immediate_threat=True,      # 35
        is_medical_emergency=True,     # 25
        people_urgent=4,               # 15
        is_vulnerable_present=True,    # 10
        is_essential_unavailable=True, # 10
        created_at=created_at,         # max 5
        now=now,
    )
    # Raw sum: 35 + 25 + 15 + 10 + 10 + 5 = 100
    assert result.total_score == 100
    assert result.priority_band == "CRITICAL"
    assert len([f for f in result.factors if f.applied]) == 6

def test_single_urgent_person_scoring():
    engine = PriorityEngine()
    result = engine.calculate(
        is_immediate_threat=False,
        is_medical_emergency=False,
        people_urgent=1,
        is_vulnerable_present=True,
        is_essential_unavailable=False,
    )
    # 8 + 10 = 18
    assert result.total_score == 18
    assert result.priority_band == "LOW"

def test_waiting_time_hourly_cap():
    engine = PriorityEngine()
    now = datetime.datetime.utcnow()
    # 3 hours waiting -> 3 points
    res3 = engine.calculate(
        is_immediate_threat=False,
        is_medical_emergency=False,
        people_urgent=0,
        is_vulnerable_present=False,
        is_essential_unavailable=False,
        created_at=now - datetime.timedelta(hours=3),
        now=now
    )
    assert res3.total_score == 3

    # 20 hours waiting -> capped at 5
    res20 = engine.calculate(
        is_immediate_threat=False,
        is_medical_emergency=False,
        people_urgent=0,
        is_vulnerable_present=False,
        is_essential_unavailable=False,
        created_at=now - datetime.timedelta(hours=20),
        now=now
    )
    assert res20.total_score == 5
