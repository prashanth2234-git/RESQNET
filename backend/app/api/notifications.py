from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["In-App Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Query notifications specifically for this user OR targeted to their role
    notifs = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.target_role == current_user.role
        )
    ).order_by(desc(Notification.created_at)).limit(50).all()

    return [NotificationResponse.model_validate(n) for n in notifs]

@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationResponse.model_validate(notif)

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.target_role == current_user.role
        ),
        Notification.is_read == False
    ).all()
    for n in notifs:
        n.is_read = True
    db.commit()
    return {"message": "All notifications marked as read.", "count": len(notifs)}
