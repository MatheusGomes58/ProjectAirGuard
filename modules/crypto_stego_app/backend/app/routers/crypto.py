from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas
from app.core import crypto_utils
from datetime import datetime
import tempfile
import time
import os

router = APIRouter()

@router.post("/symmetric/encrypt")
async def symmetric_encrypt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    start_time = time.time()
    
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            await file.seek(0)
            crypto_utils.sym_encrypt_stream(file.file, out_f)
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=500, detail=str(e))
            
    await file.seek(0, 2)
    file_size_bytes = file.file.tell()
    
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=file_size_bytes,
        operation="sym_enc",
        execution_time_ms=exec_time_ms
    ))
    
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f"attachment; filename=encrypted_{file.filename}"
    }, background=BackgroundTask(os.remove, temp_path))

@router.post("/symmetric/decrypt")
async def symmetric_decrypt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    start_time = time.time()
    
    await file.seek(0)
    key = file.file.read(32)
    if len(key) < 32:
        raise HTTPException(status_code=400, detail="Invalid file format for decryption")
        
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            crypto_utils.sym_decrypt_stream(file.file, out_f, key)
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail="Decryption failed. Bad key or corrupted data.")
            
    await file.seek(0, 2)
    file_size_bytes = file.file.tell()
    
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=file_size_bytes,
        operation="sym_dec",
        execution_time_ms=exec_time_ms
    ))
    
    filename = file.filename
    if filename.startswith("encrypted_"):
        original_filename = filename.replace("encrypted_", "", 1)
    elif filename.startswith("criptografado_"):
        original_filename = filename.replace("criptografado_", "", 1)
    else:
        original_filename = f"decrypted_{filename}"
    
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="{original_filename}"'
    }, background=BackgroundTask(os.remove, temp_path))

@router.post("/asymmetric/keys")
async def generate_keys():
    pem_private, pem_public = crypto_utils.generate_rsa_keys()
    return {
        "private_key": pem_private.decode('utf-8'),
        "public_key": pem_public.decode('utf-8')
    }

@router.post("/asymmetric/encrypt")
async def asymmetric_encrypt(file: UploadFile = File(...), public_key: str = Form(...), db: Session = Depends(get_db)):
    start_time = time.time()
    
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            await file.seek(0)
            public_key_bytes = public_key.encode('utf-8')
            crypto_utils.asym_encrypt_stream(file.file, out_f, public_key_bytes)
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=500, detail=str(e))
            
    await file.seek(0, 2)
    file_size_bytes = file.file.tell()
    
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=file_size_bytes,
        operation="asym_enc",
        execution_time_ms=exec_time_ms
    ))
    
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="rsa_encrypted_{file.filename}"'
    }, background=BackgroundTask(os.remove, temp_path))

@router.post("/asymmetric/decrypt")
async def asymmetric_decrypt(file: UploadFile = File(...), private_key: str = Form(...), db: Session = Depends(get_db)):
    start_time = time.time()
    
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            await file.seek(0)
            clean_key = private_key.strip()
            crypto_utils.asym_decrypt_stream(file.file, out_f, clean_key.encode('utf-8'))
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")
            
    await file.seek(0, 2)
    file_size_bytes = file.file.tell()
    
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=file_size_bytes,
        operation="asym_dec",
        execution_time_ms=exec_time_ms
    ))
    
    filename = file.filename
    if filename.startswith("rsa_encrypted_"):
        original_filename = filename.replace("rsa_encrypted_", "", 1)
    elif filename.startswith("rsa_criptografado_"):
        original_filename = filename.replace("rsa_criptografado_", "", 1)
    else:
        original_filename = filename.replace("decrypted_", "", 1) # fallback
        
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="{original_filename}"'
    }, background=BackgroundTask(os.remove, temp_path))

