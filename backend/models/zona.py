from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Zona(Base):
    __tablename__ = "zonas"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True, nullable=False)
    activa = Column(Boolean, default=True)
