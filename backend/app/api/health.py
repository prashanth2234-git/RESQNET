import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as ex:
        db_status = f"unhealthy: {str(ex)}"

    return {
        "status": "online",
        "service": "RESQNET Core API",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "database": db_status,
        "disclaimer": "RESQNET is a demonstration prototype, not an official emergency dispatch service. If you are in immediate danger, contact your local official emergency services."
    }
