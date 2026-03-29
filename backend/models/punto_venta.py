from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class PuntoVenta(Base):
    __tablename__ = "puntos_venta"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True, index=True, nullable=False)
    descripcion = Column(String, nullable=False)
    
    # Fundamental para el futuro envío del XML a la AFIP
    facturacion_electronica = Column(Boolean, default=False, nullable=False)
    
    activo = Column(Boolean, default=True, nullable=False)
