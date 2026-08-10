from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Devolucion(Base):
    __tablename__ = "devoluciones"

    id = Column(Integer, primary_key=True, index=True)
    punto_venta_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=False)
    numero_comprobante = Column(Integer, nullable=False)

    fecha = Column(DateTime, default=datetime.datetime.utcnow)

    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transporte_id = Column(Integer, ForeignKey("transportes.id"), nullable=True)

    motivo = Column(Text, nullable=False)
    observaciones = Column(Text, nullable=True)

    punto_venta = relationship("PuntoVenta", lazy="joined")
    cliente = relationship("Cliente", lazy="joined")
    usuario = relationship("User", lazy="joined")
    transporte = relationship("Transporte", lazy="joined")

    detalles = relationship("DevolucionDetalle", back_populates="devolucion", cascade="all, delete-orphan", lazy="joined")

class DevolucionDetalle(Base):
    __tablename__ = "devolucion_detalles"

    id = Column(Integer, primary_key=True, index=True)
    devolucion_id = Column(Integer, ForeignKey("devoluciones.id"), nullable=False)

    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Float, default=1.0)
    nro_lote = Column(String, nullable=True)

    devolucion = relationship("Devolucion", back_populates="detalles")
    producto = relationship("Producto", lazy="joined")
