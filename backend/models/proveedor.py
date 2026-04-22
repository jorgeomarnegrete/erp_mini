from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Proveedor(Base):
    __tablename__ = "proveedores"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identidad y Legal
    razon_social = Column(String, index=True, nullable=False)
    nombre_fantasia = Column(String, nullable=True)
    tipo_doc_id = Column(Integer, ForeignKey("tipo_doc.id"), nullable=False)
    documento = Column(String, unique=True, index=True, nullable=False)
    tipo_resp_id = Column(Integer, ForeignKey("tipo_resp.id"), nullable=False)
    
    # Ubicación Geográfica
    provincia = Column(String, nullable=True)
    localidad = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    codigo_postal = Column(String, nullable=True)
    
    # Contacto Comercial Base
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Personas de Contacto Interno
    contacto_nombre = Column(String, nullable=True)
    contacto_telefono = Column(String, nullable=True)
    contacto_email = Column(String, nullable=True)

    # Administrativo
    cbu_alias = Column(String, nullable=True)
    condicion_pago_defecto = Column(String, nullable=True)
    observaciones = Column(Text, nullable=True)
    
    activo = Column(Boolean, default=True)

    # Relaciones SQLAlchemy para lecturas cruzadas veloces
    tipo_doc = relationship("TipoDoc", lazy="joined")
    tipo_resp = relationship("TipoResp", lazy="joined")
