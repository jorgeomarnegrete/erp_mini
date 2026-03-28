from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class TipoDoc(Base):
    __tablename__ = "tipo_doc"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    abreviatura = Column(String, nullable=False)
    codigo_arca = Column(String, unique=True, index=True, nullable=False)
    activo = Column(Boolean, default=True)
