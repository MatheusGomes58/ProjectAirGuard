from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas
from app.core import crypto_utils
from datetime import datetime
import time

router = APIRouter()

@router.post("/symmetric/encrypt")
async def symmetric_encrypt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    start_time = time.time()
    contents = await file.read()
    
    try:
        key, encrypted_data = crypto_utils.sym_encrypt(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=len(contents),
        operation="sym_enc",
        execution_time_ms=exec_time_ms
    ))
    
    # Return output. We'll return key + encrypted_data for simplicity
    # A real system would secure the key, but user needs it to decrypt.
    # We will prepend the 32-byte key to the output file.
    output = key + encrypted_data
    
    return Response(content=output, media_type="application/octet-stream", headers={
        "Content-Disposition": f"attachment; filename=encrypted_{file.filename}"
    })

@router.post("/symmetric/decrypt")
async def symmetric_decrypt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    start_time = time.time()
    contents = await file.read()
    
    if len(contents) < 32 + 16:
        raise HTTPException(status_code=400, detail="Invalid file format for decryption")
        
    key = contents[:32]
    ct_with_iv = contents[32:]
    
    try:
        decrypted_data = crypto_utils.sym_decrypt(ct_with_iv, key)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Decryption failed. Bad key or corrupted data.")
        
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=len(contents),
        operation="sym_dec",
        execution_time_ms=exec_time_ms
    ))
    
    original_filename = file.filename.replace("encrypted_", "") if file.filename.startswith("encrypted_") else f"decrypted_{file.filename}"
    
    return Response(content=decrypted_data, media_type="application/octet-stream", headers={
        "Content-Disposition": f"attachment; filename={original_filename}"
    })

@router.post("/asymmetric/keys")
async def generate_keys():
    pem_private, pem_public = crypto_utils.generate_rsa_keys()
    # Return as a simple JSON with Base64 or plain strings
    return {
        "private_key": pem_private.decode('utf-8'),
        "public_key": pem_public.decode('utf-8')
    }

@router.post("/asymmetric/encrypt")
async def asymmetric_encrypt(file: UploadFile = File(...), public_key: str = Form(...), db: Session = Depends(get_db)):
    start_time = time.time()
    contents = await file.read()
    
    try:
        encrypted_data = crypto_utils.asym_encrypt(contents, public_key.encode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=len(contents),
        operation="asym_enc",
        execution_time_ms=exec_time_ms
    ))
    
    return Response(content=encrypted_data, media_type="application/octet-stream", headers={
        "Content-Disposition": f"attachment; filename=rsa_encrypted_{file.filename}"
    })

@router.post("/asymmetric/decrypt")
async def asymmetric_decrypt(file: UploadFile = File(...), private_key: str = Form(...), db: Session = Depends(get_db)):
    start_time = time.time()
    contents = await file.read()
    
    try:
        decrypted_data = crypto_utils.asym_decrypt(contents, private_key.encode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")
        
    end_time = time.time()
    exec_time_ms = (end_time - start_time) * 1000
    
    crud.create_history_record(db, schemas.HistoryCreate(
        file_name=file.filename,
        file_size_bytes=len(contents),
        operation="asym_dec",
        execution_time_ms=exec_time_ms
    ))
    
    original_filename = file.filename.replace("rsa_encrypted_", "")
    return Response(content=decrypted_data, media_type="application/octet-stream", headers={
        "Content-Disposition": f"attachment; filename={original_filename}"
    })
