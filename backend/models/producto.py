from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
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
    
    # Lotes de stock vinculados
    lotes = relationship("ProductoLoteStock", back_populates="producto", cascade="all, delete-orphan")

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

class ProductoLoteStock(Base):
    """Saldos de stock desglosados por lote y vencimiento"""
    __tablename__ = "producto_lotes_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    nro_lote = Column(String, index=True, nullable=True)
    fecha_vencimiento = Column(DateTime, index=True, nullable=True)
    cantidad_actual = Column(Float, default=0.0)
    
    producto = relationship("Producto", back_populates="lotes")

class ProductoEtiqueta(Base):
    """Configuración de etiqueta bromatológica/fiscal por producto (1:1 con Producto)"""
    __tablename__ = "producto_etiquetas"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), unique=True, nullable=False)

    # --- Identificación Fiscal ---
    descripcion_larga     = Column(Text, nullable=True)
    senasa_nro            = Column(String, nullable=True)   # "3256/4430D/1"
    rnpa_nro              = Column(String, nullable=True)   # "4048/21054"
    industria_argentina   = Column(Boolean, default=True)
    peso_neto             = Column(String, nullable=True)   # "6 KG" (texto libre)

    # --- Tabla Nutricional (por porción) ---
    porcion_descripcion   = Column(String, nullable=True)   # "130 gr / 1 unidad"
    valor_energetico_kcal = Column(Float, nullable=True)
    valor_energetico_kj   = Column(Float, nullable=True)
    valor_energetico_vd   = Column(Integer, nullable=True)
    carbohidratos_g       = Column(Float, nullable=True)
    carbohidratos_vd      = Column(Integer, nullable=True)
    proteinas_g           = Column(Float, nullable=True)
    proteinas_vd          = Column(Integer, nullable=True)
    grasas_totales_g      = Column(Float, nullable=True)
    grasas_totales_vd     = Column(Integer, nullable=True)
    grasas_saturadas_g    = Column(Float, nullable=True)
    grasas_saturadas_vd   = Column(Integer, nullable=True)
    grasas_trans_g        = Column(Float, nullable=True)    # sin %VD (siempre ".")
    fibra_alimentaria_g   = Column(Float, nullable=True)
    fibra_alimentaria_vd  = Column(Integer, nullable=True)
    sodio_mg              = Column(Float, nullable=True)
    sodio_vd              = Column(Integer, nullable=True)

    # --- Textos Legales ---
    ingredientes          = Column(Text, nullable=True)
    conservacion          = Column(Text, nullable=True)     # multilinea con temperaturas
    elaborado_por         = Column(String, nullable=True)   # varía por producto
    para_establecimiento  = Column(String, nullable=True)   # varía por producto
    codigo_ep             = Column(String, nullable=True)   # "EP005"
    codigo_hm             = Column(String, nullable=True)   # "HM"

    producto = relationship("Producto", backref="etiqueta", uselist=False)
