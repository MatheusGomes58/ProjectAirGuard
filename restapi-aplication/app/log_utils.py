from sqlalchemy.orm import Session
from app.models import Log

def create_log(db: Session, action: str, details: str):
    log_entry = Log(action=action, details=details)
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
