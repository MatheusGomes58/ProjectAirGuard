from pydantic import BaseModel
from datetime import datetime

# Schema para criar um Log
class LogCreate(BaseModel):
    action: str
    details: str

    class Config:
        orm_mode = True

# Schema para leitura de Log
class Log(BaseModel):
    id: int
    action: str
    details: str
    timestamp: datetime

    class Config:
        orm_mode = True


class ItemCreate(BaseModel):
    name: str
    description: str
