from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Empresa(Base):
    """
    Tabla Singleton (ID siempre 1). Representa la identidad de la empresa
    emisora de los comprobantes, sus logos y locación.
    """
    __tablename__ = "empresa"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identidad y Fiscales
    razon_social = Column(String, nullable=False)
    nombre_fantasia = Column(String, nullable=True)
    cuit = Column(String, nullable=False)
    ingresos_brutos = Column(String, nullable=True)
    fecha_inicio_actividades = Column(Date, nullable=True)
    tipo_resp_id = Column(Integer, ForeignKey("tipo_resp.id"), nullable=False)
    
    # Locación y Contacto Similar a Clientes
    domicilio_comercial = Column(String, nullable=False)
    provincia = Column(String, nullable=True)
    localidad = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    sitio_web = Column(String, nullable=True)
    
    # Diseño (Imagen en texto cifrado directo a DB por portabilidad en Docker)
    logo_base64 = Column(Text, nullable=True)

    # Relaciones SQLAlchemy
    tipo_resp = relationship("TipoResp", lazy="joined")
