from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class HistoryBase(BaseModel):
    file_name: str
    file_size_bytes: int
    operation: str
    execution_time_ms: float

class HistoryCreate(HistoryBase):
    pass

class History(HistoryBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
