from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import crypto, stego, history
import time
from sqlalchemy.exc import OperationalError

# Robust DB initialization
def init_db():
    max_retries = 5
    for i in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            print("Database connected and tables created successfully!")
            break
        except Exception as e:
            print(f"Database connection failed. Retrying in 3 seconds... ({i+1}/{max_retries})")
            print(str(e))
            time.sleep(3)
    else:
        print("Failed to connect to database after maximum retries.")

init_db()

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
