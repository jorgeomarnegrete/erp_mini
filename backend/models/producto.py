from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_interno = Column(String, unique=True, index=True, nullable=False)
    codigo_barras = Column(String, unique=True, index=True, nullable=True)
    nombre = Column(String, index=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    
    # Anclas comerciales
    categoria_id = Column(Integer, ForeignKey("categorias_rubros.id"), nullable=False)
    tasa_iva_id = Column(Integer, ForeignKey("tasas_iva.id"), nullable=False)
    
    costo_neto = Column(Float, nullable=False, default=0.0)
    stock_actual = Column(Float, nullable=False, default=0.0)
    stock_minimo = Column(Float, nullable=False, default=0.0)
    unidad = Column(String, nullable=False, default="Unidades")
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones Eager.
    categoria = relationship("Categoria", lazy="joined")
    tasa_iva = relationship("TasaIva", lazy="joined")
    # Borrar precios costum si el producto muere
    precios_personalizados = relationship("ProductoPrecio", back_populates="producto", cascade="all, delete-orphan", lazy="joined")

class ProductoPrecio(Base):
    """Tabla Híbrida Pivot Matrix para anclas de excepción de márgenes"""
    __tablename__ = "producto_lista_precios"
    
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    lista_precio_id = Column(Integer, ForeignKey("lista_precio.id", ondelete="CASCADE"), nullable=False)
    
    # El precio EXCEPCIONAL NETO que ingresa a mano el usuario para romper el cálculo sugerido
    precio_personalizado = Column(Float, nullable=False)
    
    producto = relationship("Producto", back_populates="precios_personalizados")
    lista_precio = relationship("ListaPrecio", lazy="joined")
