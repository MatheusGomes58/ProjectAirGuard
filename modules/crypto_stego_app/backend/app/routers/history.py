from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud
import csv
import io

router = APIRouter()

@router.get("/")
def get_history(db: Session = Depends(get_db)):
    records = crud.get_histories(db)
    return records

@router.get("/csv")
def download_history_csv(db: Session = Depends(get_db)):
    records = crud.get_histories(db)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ID", "Timestamp", "File Name", "File Size (Bytes)", "Operation", "Execution Time (ms)"])
    
    for record in records:
        writer.writerow([
            record.id,
            record.timestamp.isoformat(),
            record.file_name,
            record.file_size_bytes,
            record.operation,
            record.execution_time_ms
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=crypto_history.csv"
    return response
