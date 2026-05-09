from sqlalchemy import Column, Integer, String
from database import Base

class Transporte(Base):
    __tablename__ = "transportes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_tango = Column(String, unique=True, index=True, nullable=True) # COD_GVA24
    nombre = Column(String, index=True, nullable=False) # NOMBRE_TRA
    cuit = Column(String, nullable=True) # CUIT_TRANS
    domicilio = Column(String, nullable=True) # DOM_TRANS
    localidad = Column(String, nullable=True) # LOCALIDAD
    telefono = Column(String, nullable=True) # TELEFONO
