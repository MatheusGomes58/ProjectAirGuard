from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas
from app.core import crypto_utils
import tempfile
import time
import uuid
import os

router = APIRouter()

@router.post("/upload_chunk")
async def upload_chunk(
    upload_id: str = Form(...),
    chunk: UploadFile = File(...)
):
    temp_dir = tempfile.gettempdir()
    path = os.path.join(temp_dir, f"{upload_id}_upload")
    with open(path, "ab") as f:
        f.write(await chunk.read())
    return {"status": "ok"}

@router.post("/symmetric/encrypt")
async def symmetric_encrypt(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    temp_dir = tempfile.gettempdir()
    
    if upload_id is not None:
        input_path = os.path.join(temp_dir, f"{upload_id}_upload")
        if not os.path.exists(input_path):
            raise HTTPException(status_code=400, detail="Uploaded file chunks not found")
        actual_filename = filename or upload_id
    elif file is not None:
        input_path = os.path.join(temp_dir, f"{uuid.uuid4()}_upload")
        with open(input_path, "wb") as f:
            f.write(await file.read())
        actual_filename = file.filename
    else:
        raise HTTPException(status_code=400, detail="file or upload_id is required")
        
    file_size_bytes = os.path.getsize(input_path)
    
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            with open(input_path, "rb") as in_f:
                crypto_utils.sym_encrypt_stream(in_f, out_f)
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if os.path.exists(input_path):
                os.remove(input_path)
                
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=actual_filename,
        file_size_bytes=file_size_bytes,
        operation="sym_enc",
        execution_time_ms=exec_time_ms
    ))
    
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="encrypted_{actual_filename}"'
    }, background=BackgroundTask(os.remove, temp_path))

@router.post("/symmetric/decrypt")
async def symmetric_decrypt(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    temp_dir = tempfile.gettempdir()
    
    if upload_id is not None:
        input_path = os.path.join(temp_dir, f"{upload_id}_upload")
        if not os.path.exists(input_path):
            raise HTTPException(status_code=400, detail="Uploaded file chunks not found")
        actual_filename = filename or upload_id
    elif file is not None:
        input_path = os.path.join(temp_dir, f"{uuid.uuid4()}_upload")
        with open(input_path, "wb") as f:
            f.write(await file.read())
        actual_filename = file.filename
    else:
        raise HTTPException(status_code=400, detail="file or upload_id is required")
        
    file_size_bytes = os.path.getsize(input_path)
    
    with open(input_path, "rb") as in_f:
        key = in_f.read(32)
        
    if len(key) < 32:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=400, detail="Invalid file format for decryption")
        
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            with open(input_path, "rb") as in_f:
                in_f.seek(32)
                crypto_utils.sym_decrypt_stream(in_f, out_f, key)
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail="Decryption failed. Bad key or corrupted data.")
        finally:
            if os.path.exists(input_path):
                os.remove(input_path)
            
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=actual_filename,
        file_size_bytes=file_size_bytes,
        operation="sym_dec",
        execution_time_ms=exec_time_ms
    ))
    
    if actual_filename.startswith("encrypted_"):
        original_filename = actual_filename.replace("encrypted_", "", 1)
    elif actual_filename.startswith("criptografado_"):
        original_filename = actual_filename.replace("criptografado_", "", 1)
    else:
        original_filename = f"decrypted_{actual_filename}"
    
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
async def asymmetric_encrypt(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    public_key: str = Form(...),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    temp_dir = tempfile.gettempdir()
    
    if upload_id is not None:
        input_path = os.path.join(temp_dir, f"{upload_id}_upload")
        if not os.path.exists(input_path):
            raise HTTPException(status_code=400, detail="Uploaded file chunks not found")
        actual_filename = filename or upload_id
    elif file is not None:
        input_path = os.path.join(temp_dir, f"{uuid.uuid4()}_upload")
        with open(input_path, "wb") as f:
            f.write(await file.read())
        actual_filename = file.filename
    else:
        raise HTTPException(status_code=400, detail="file or upload_id is required")
        
    file_size_bytes = os.path.getsize(input_path)
    
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            public_key_bytes = public_key.encode('utf-8')
            with open(input_path, "rb") as in_f:
                crypto_utils.asym_encrypt_stream(in_f, out_f, public_key_bytes)
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if os.path.exists(input_path):
                os.remove(input_path)
            
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=actual_filename,
        file_size_bytes=file_size_bytes,
        operation="asym_enc",
        execution_time_ms=exec_time_ms
    ))
    
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="rsa_encrypted_{actual_filename}"'
    }, background=BackgroundTask(os.remove, temp_path))

@router.post("/asymmetric/decrypt")
async def asymmetric_decrypt(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    private_key: str = Form(...),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    temp_dir = tempfile.gettempdir()
    
    if upload_id is not None:
        input_path = os.path.join(temp_dir, f"{upload_id}_upload")
        if not os.path.exists(input_path):
            raise HTTPException(status_code=400, detail="Uploaded file chunks not found")
        actual_filename = filename or upload_id
    elif file is not None:
        input_path = os.path.join(temp_dir, f"{uuid.uuid4()}_upload")
        with open(input_path, "wb") as f:
            f.write(await file.read())
        actual_filename = file.filename
    else:
        raise HTTPException(status_code=400, detail="file or upload_id is required")
        
    file_size_bytes = os.path.getsize(input_path)
    
    fd, temp_path = tempfile.mkstemp()
    with os.fdopen(fd, 'wb') as out_f:
        try:
            clean_key = private_key.strip()
            with open(input_path, "rb") as in_f:
                crypto_utils.asym_decrypt_stream(in_f, out_f, clean_key.encode('utf-8'))
        except Exception as e:
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")
        finally:
            if os.path.exists(input_path):
                os.remove(input_path)
            
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=actual_filename,
        file_size_bytes=file_size_bytes,
        operation="asym_dec",
        execution_time_ms=exec_time_ms
    ))
    
    if actual_filename.startswith("rsa_encrypted_"):
        original_filename = actual_filename.replace("rsa_encrypted_", "", 1)
    elif actual_filename.startswith("rsa_criptografado_"):
        original_filename = actual_filename.replace("rsa_criptografado_", "", 1)
    else:
        original_filename = actual_filename.replace("decrypted_", "", 1) # fallback
        
    return FileResponse(temp_path, media_type="application/octet-stream", headers={
        "Content-Disposition": f'attachment; filename="{original_filename}"'
    }, background=BackgroundTask(os.remove, temp_path))
