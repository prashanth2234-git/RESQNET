from typing import Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        title: str,
        message: str,
        notification_type: str,
        user_id: Optional[int] = None,
        target_role: Optional[str] = None,
        request_id: Optional[int] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            target_role=target_role,
            title=title,
            message=message,
            notification_type=notification_type,
            request_id=request_id,
            is_read=False,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def notify_new_request(db: Session, request_id: int, tracking_code: str, incident_type: str, priority_band: str):
        title = f"New {incident_type} Request [{tracking_code}]"
        message = f"Priority: {priority_band}. Requires coordinator triage and verification."
        NotificationService.create_notification(
            db=db,
            title=title,
            message=message,
            notification_type=NotificationType.NEW_REQUEST,
            target_role="COORDINATOR",
            request_id=request_id,
        )

    @staticmethod
    def notify_assignment(db: Session, responder_user_id: int, request_id: int, tracking_code: str, team_name: str):
        title = f"New Assignment: [{tracking_code}]"
        message = f"Your unit '{team_name}' has been assigned to assistance request {tracking_code}."
        NotificationService.create_notification(
            db=db,
            title=title,
            message=message,
            notification_type=NotificationType.ASSIGNMENT,
            user_id=responder_user_id,
            request_id=request_id,
        )

    @staticmethod
    def notify_status_change(db: Session, request_id: int, tracking_code: str, new_status: str, citizen_user_id: Optional[int] = None):
        if citizen_user_id:
            title = f"Status Update: {tracking_code}"
            message = f"Your assistance request status has transitioned to: {new_status}."
            NotificationService.create_notification(
                db=db,
                title=title,
                message=message,
                notification_type=NotificationType.STATUS_CHANGE,
                user_id=citizen_user_id,
                request_id=request_id,
            )

notification_service = NotificationService()
