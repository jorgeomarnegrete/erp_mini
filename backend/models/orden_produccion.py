from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base


class OrdenProduccion(Base):
    """
    Cabecera de una Orden de Producción (OP): procesamiento de materia prima
    (insumos) que se transforma en subproductos. N insumos -> M subproductos,
    con merma (Σ salidas != Σ entradas).

    Estados: "Abierta" (compromete stock por cálculo, no mueve físico),
             "Cerrada" (aplica movimientos y es inmutable),
             "Cancelada" (libera el compromiso).

    IMPORTANTE: la OP NO registra movimientos en stk_mov. Afecta
    productos.stock_actual y ProductoLoteStock directamente, como los Remitos.
    """
    __tablename__ = "ordenes_produccion"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, nullable=False)

    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_cierre = Column(DateTime, nullable=True)

    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    estado = Column(String, default="Abierta")  # Abierta, Cerrada, Cancelada
    observaciones = Column(Text, nullable=True)

    usuario = relationship("User", lazy="joined")

    insumos = relationship("OpInsumo", back_populates="orden", cascade="all, delete-orphan", lazy="joined")
    productos = relationship("OpProducto", back_populates="orden", cascade="all, delete-orphan", lazy="joined")


class OpInsumo(Base):
    """Materia prima consumida por la OP (producto primario)."""
    __tablename__ = "op_insumos"

    id = Column(Integer, primary_key=True, index=True)
    op_id = Column(Integer, ForeignKey("ordenes_produccion.id"), nullable=False)

    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad_planificada = Column(Float, default=0.0)
    cantidad_real = Column(Float, default=0.0)
    nro_lote = Column(String, nullable=True)  # lote de origen del que se descuenta

    orden = relationship("OrdenProduccion", back_populates="insumos")
    producto = relationship("Producto", lazy="joined")


class OpProducto(Base):
    """Subproducto generado por la OP."""
    __tablename__ = "op_productos"

    id = Column(Integer, primary_key=True, index=True)
    op_id = Column(Integer, ForeignKey("ordenes_produccion.id"), nullable=False)

    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad_planificada = Column(Float, default=0.0)
    cantidad_real = Column(Float, default=0.0)
    nro_lote_generado = Column(String, nullable=True)
    fecha_vencimiento = Column(DateTime, nullable=True)

    orden = relationship("OrdenProduccion", back_populates="productos")
    producto = relationship("Producto", lazy="joined")
