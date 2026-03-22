from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base
from datetime import datetime

class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    file_name = Column(String, index=True)
    file_size_bytes = Column(Integer)
    operation = Column(String, index=True) # e.g., sym_enc, sym_dec, asym_enc, asym_dec, stego_enc, stego_dec
    execution_time_ms = Column(Float)
