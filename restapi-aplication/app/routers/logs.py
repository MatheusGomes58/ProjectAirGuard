from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter()

# Endpoint para criar um novo log
@router.post("/", response_model=schemas.LogCreate)
def create_log(log: schemas.LogCreate, db: Session = Depends(get_db)):
    db_log = models.Log(action=log.action, details=log.details)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# Endpoint para buscar um log por ID
@router.get("/{log_id}")
def read_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.Log).filter(models.Log.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return log
