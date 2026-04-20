from pydantic import BaseModel, Field
from typing import List, Optional
from schemas.categoria import CategoriaResponse
from schemas.tasa_iva import TasaIvaResponse
from schemas.lista_precio import ListaPrecioResponse

# Modelo para los Precios Overrides (Estructura de la Casilla Manual)
class ProductoPrecioBase(BaseModel):
    lista_precio_id: int
    precio_personalizado: float = Field(gt=0, description="El número manual neto inyectado por el usuario")

class ProductoPrecioCreate(ProductoPrecioBase):
    pass

class ProductoPrecioResponse(ProductoPrecioBase):
    id: int
    lista_precio: ListaPrecioResponse

    class Config:
        from_attributes = True

# Modelo Central del Producto
class ProductoBase(BaseModel):
    codigo_interno: str
    codigo_barras: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    categoria_id: int
    tasa_iva_id: int
    costo_neto: float = Field(default=0.0, ge=0)
    stock_actual: float = Field(default=0.0)
    stock_minimo: float = Field(default=0.0)
    unidad: str = "Unidades"
    activo: bool = True

class ProductoCreate(ProductoBase):
    # Cuando graban a DB, el front end enviará sus casillas híbridas "manuales" en formato array
    precios_costum: List[ProductoPrecioCreate] = []

class ProductoUpdate(BaseModel):
    codigo_interno: str | None = None
    codigo_barras: str | None = None
    nombre: str | None = None
    descripcion: str | None = None
    categoria_id: int | None = None
    tasa_iva_id: int | None = None
    costo_neto: float | None = None
    stock_actual: float | None = None
    stock_minimo: float | None = None
    unidad: str | None = None
    activo: bool | None = None
    precios_costum: List[ProductoPrecioCreate] | None = None

class ProductoResponse(ProductoBase):
    id: int
    categoria: CategoriaResponse
    tasa_iva: TasaIvaResponse
    precios_personalizados: List[ProductoPrecioResponse]

    class Config:
        from_attributes = True
