from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class PuntoVenta(Base):
    __tablename__ = "puntos_venta"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True, index=True, nullable=False)
    descripcion = Column(String, nullable=False)
    
    # Fundamental para el futuro envío del XML a la AFIP
    facturacion_electronica = Column(Boolean, default=False, nullable=False)
    
    # Numeradores y correlativos activos para este punto de venta
    prox_cotizacion = Column(Integer, default=1, nullable=False)
    prox_pedido = Column(Integer, default=1, nullable=False)
    prox_factura_a = Column(Integer, default=1, nullable=False)
    prox_factura_b = Column(Integer, default=1, nullable=False)
    prox_factura_c = Column(Integer, default=1, nullable=False)
    prox_remito = Column(Integer, default=1, nullable=False)
    prox_recibo = Column(Integer, default=1, nullable=False)
    
    activo = Column(Boolean, default=True, nullable=False)
