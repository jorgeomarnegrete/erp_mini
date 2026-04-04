from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    punto_venta_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=False)
    numero_comprobante = Column(Integer, nullable=False)
    
    fecha_emision = Column(DateTime, default=datetime.datetime.utcnow)
    
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=True)
    
    estado = Column(String, default="Borrador") # Borrador, Aprobada, Rechazada, Facturada
    observaciones = Column(Text, nullable=True)
    
    # Totales cabecera paramétricos
    subtotal = Column(Float, default=0.0)
    descuento_porcentaje = Column(Float, default=0.0)
    descuento_monto = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    # Relaciones nativas lazy=joined as required by Pydantic response models
    punto_venta = relationship("PuntoVenta", lazy="joined")
    cliente = relationship("Cliente", lazy="joined")
    vendedor = relationship("Vendedor", lazy="joined")
    
    # Backref para renglones
    detalles = relationship("CotizacionDetalle", back_populates="cotizacion", cascade="all, delete-orphan", lazy="joined")

class CotizacionDetalle(Base):
    __tablename__ = "cotizacion_detalles"
    
    id = Column(Integer, primary_key=True, index=True)
    cotizacion_id = Column(Integer, ForeignKey("cotizaciones.id"), nullable=False)
    
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    descripcion = Column(String, nullable=False) # Copia de respaldo por si el catalogo es modificado luego
    
    cantidad = Column(Float, default=1.0)
    precio_unitario = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0) # cant * precio_unitario
    
    # Relación Inversa
    cotizacion = relationship("Cotizacion", back_populates="detalles")
    producto = relationship("Producto", lazy="joined")
