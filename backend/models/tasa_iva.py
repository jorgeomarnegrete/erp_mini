from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class TasaIva(Base):
    __tablename__ = "tasas_iva"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    valor = Column(Float, nullable=False)
    codigo_arca = Column(String, unique=True, index=True, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
