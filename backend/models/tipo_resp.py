from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class TipoResp(Base):
    __tablename__ = "tipo_resp"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    abreviatura = Column(String, nullable=False)
    codigo_arca = Column(String, unique=True, index=True, nullable=False)
    activo = Column(Boolean, default=True)
