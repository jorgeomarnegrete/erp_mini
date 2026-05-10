from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
import datetime
from database import Base

class RemitoCompra(Base):
    __tablename__ = "remitos_compra"
    
    id = Column(Integer, primary_key=True, index=True)
    numero_remito = Column(String, nullable=False) # Ej: X-0001-00001234
    
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    afecta_stock = Column(Boolean, default=True)
    observaciones = Column(Text, nullable=True)
    
    # Totales
    total = Column(Float, default=0.0)
    
    # Relaciones
    proveedor = relationship("Proveedor", lazy="joined")
    usuario = relationship("User", lazy="joined")
    
    detalles = relationship("RemitoCompraDetalle", back_populates="remito", cascade="all, delete-orphan", lazy="joined")

class RemitoCompraDetalle(Base):
    __tablename__ = "remito_compra_detalles"
    
    id = Column(Integer, primary_key=True, index=True)
    remito_compra_id = Column(Integer, ForeignKey("remitos_compra.id"), nullable=False)
    
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    
    cantidad = Column(Float, default=1.0)
    cantidad_recibida = Column(Float, default=0.0)
    precio_unitario = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    
    # Relación Inversa
    remito = relationship("RemitoCompra", back_populates="detalles")
    producto = relationship("Producto", lazy="joined")
