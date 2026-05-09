from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Remito(Base):
    __tablename__ = "remitos"
    
    id = Column(Integer, primary_key=True, index=True)
    punto_venta_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=False)
    numero_comprobante = Column(Integer, nullable=False)
    
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=True)
    
    descuenta_stock = Column(Boolean, default=True)
    observaciones = Column(Text, nullable=True)
    
    transporte_id = Column(Integer, ForeignKey("transportes.id"), nullable=True)
    stock_procesado = Column(Boolean, default=False)
    
    # Totales
    total = Column(Float, default=0.0)
    
    # Relaciones
    punto_venta = relationship("PuntoVenta", lazy="joined")
    cliente = relationship("Cliente", lazy="joined")
    usuario = relationship("User", lazy="joined")
    pedido = relationship("Pedido", lazy="joined")
    transporte = relationship("Transporte", lazy="joined")
    
    detalles = relationship("RemitoDetalle", back_populates="remito", cascade="all, delete-orphan", lazy="joined")

class RemitoDetalle(Base):
    __tablename__ = "remito_detalles"
    
    id = Column(Integer, primary_key=True, index=True)
    remito_id = Column(Integer, ForeignKey("remitos.id"), nullable=False)
    
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    id_pedido_detalle = Column(Integer, ForeignKey("pedido_detalles.id"), nullable=True)
    
    cantidad = Column(Float, default=1.0)
    precio_unitario = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    
    # Relación Inversa
    remito = relationship("Remito", back_populates="detalles")
    producto = relationship("Producto", lazy="joined")
    pedido_detalle = relationship("PedidoDetalle", lazy="joined")
