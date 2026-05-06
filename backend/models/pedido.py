from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Pedido(Base):
    __tablename__ = "pedidos"
    
    id = Column(Integer, primary_key=True, index=True)
    punto_venta_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=False)
    numero_comprobante = Column(Integer, nullable=False)
    
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_entrega = Column(DateTime, nullable=True)
    
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("vendedores.id"), nullable=True)
    
    estado = Column(String, default="Pendiente") # Borrador, Pendiente, Parcial, Completado, Cancelado
    observaciones = Column(Text, nullable=True)
    
    # Totales cabecera paramétricos
    subtotal = Column(Float, default=0.0)
    descuento_porcentaje = Column(Float, default=0.0)
    descuento_monto = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    # Relaciones nativas lazy=joined as required by Pydantic response models
    punto_venta = relationship("PuntoVenta", lazy="joined")
    cliente = relationship("Cliente", lazy="joined")
    usuario = relationship("User", lazy="joined")
    vendedor = relationship("Vendedor", lazy="joined")
    
    # Backref para renglones
    detalles = relationship("PedidoDetalle", back_populates="pedido", cascade="all, delete-orphan", lazy="joined")

class PedidoDetalle(Base):
    __tablename__ = "pedido_detalles"
    
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    leyenda = Column(String, nullable=True)
    
    cantidad = Column(Float, default=1.0)
    precio_unitario = Column(Float, default=0.0)
    entregado = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0) # cantidad * precio_unitario (Neto)
    
    # Relación Inversa
    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto", lazy="joined")
