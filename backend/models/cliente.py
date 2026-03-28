from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identidad Comercial / Persona
    razon_social = Column(String, index=True, nullable=False)
    tipo_doc_id = Column(Integer, ForeignKey("tipo_doc.id"), nullable=False)
    documento = Column(String, unique=True, index=True, nullable=False)
    tipo_resp_id = Column(Integer, ForeignKey("tipo_resp.id"), nullable=False)
    
    # Operativos Módulo Ventas
    lista_precio_id = Column(Integer, ForeignKey("lista_precio.id"), nullable=True)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=True)
    
    # Relaciones Humanas
    nombre_contacto = Column(String, nullable=True)
    telefono_contacto = Column(String, nullable=True)
    email = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    
    # Ubicación y Logística
    provincia = Column(String, nullable=True)
    localidad = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    observaciones = Column(Text, nullable=True)
    
    activo = Column(Boolean, default=True)

    # Relaciones SQLAlchemy (Cruciales para el Frontend Nested)
    tipo_doc = relationship("TipoDoc", lazy="joined")
    tipo_resp = relationship("TipoResp", lazy="joined")
    lista_precio = relationship("ListaPrecio", lazy="joined")
    vendedor = relationship("Vendedor", lazy="joined")
