from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas
from app.core import stego_utils
import time

router = APIRouter()

@router.post("/encode")
async def encode_stego(file: UploadFile = File(...), secret_message: str = Form(...), db: Session = Depends(get_db)):
    start_time = time.time()
    contents = await file.read()
    
    try:
        encoded_image = stego_utils.stego_encode(contents, secret_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Steganography failed: {str(e)}")
        
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=len(contents),
        operation="stego_enc",
        execution_time_ms=exec_time_ms
    ))
    
    filename_parts = file.filename.rsplit('.', 1)
    new_filename = f"{filename_parts[0]}_stego.png"
    
    return Response(content=encoded_image, media_type="image/png", headers={
        "Content-Disposition": f"attachment; filename={new_filename}"
    })

@router.post("/decode")
async def decode_stego(file: UploadFile = File(...), db: Session = Depends(get_db)):
    start_time = time.time()
    contents = await file.read()
    
    try:
        secret_message = stego_utils.stego_decode(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Steganography decode failed: {str(e)}")
        
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=len(contents),
        operation="stego_dec",
        execution_time_ms=exec_time_ms
    ))
    
    return {"secret_message": secret_message, "execution_time_ms": exec_time_ms}
