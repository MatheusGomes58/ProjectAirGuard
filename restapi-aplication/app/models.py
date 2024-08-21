from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

# Modelo para o Item
class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True)

# Modelo para Log
class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, index=True)
    details = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

