from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import crypto, stego, history

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Crypto & Stego Project")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crypto.router, prefix="/api/crypto", tags=["Cryptography"])
app.include_router(stego.router, prefix="/api/stego", tags=["Steganography"])
app.include_router(history.router, prefix="/api/history", tags=["History"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Crypto & Stego API"}
