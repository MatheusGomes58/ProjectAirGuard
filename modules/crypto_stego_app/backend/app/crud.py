from sqlalchemy.orm import Session
from app import models, schemas

def create_history_record(db: Session, history: schemas.HistoryCreate):
    db_history = models.History(**history.model_dump())
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

def get_histories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.History).order_by(models.History.timestamp.desc()).offset(skip).limit(limit).all()
