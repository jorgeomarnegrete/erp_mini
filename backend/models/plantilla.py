from sqlalchemy import Column, Integer, String, Text, Boolean
from database import Base

class PlantillaDocumento(Base):
    __tablename__ = "plantillas_documentos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    tipo_documento = Column(String, index=True, nullable=False) # 'COTIZACION', 'FACTURA_A', etc.
    codigo_html = Column(Text, nullable=False)
    activa = Column(Boolean, default=True)
