from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.producto import ProductoResponse

# ====== INSUMOS (materia prima consumida) ======

class OpInsumoCreate(BaseModel):
    producto_id: int
    cantidad_planificada: float
    nro_lote: Optional[str] = None

class OpInsumoResponse(BaseModel):
    id: int
    producto_id: int
    cantidad_planificada: float
    cantidad_real: float
    nro_lote: Optional[str] = None
    producto: ProductoResponse

    class Config:
        from_attributes = True

# ====== PRODUCTOS (subproductos generados) ======

class OpProductoCreate(BaseModel):
    producto_id: int
    cantidad_planificada: float
    nro_lote_generado: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None

class OpProductoResponse(BaseModel):
    id: int
    producto_id: int
    cantidad_planificada: float
    cantidad_real: float
    nro_lote_generado: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None
    producto: ProductoResponse

    class Config:
        from_attributes = True

# ====== CABECERA (Orden de Producción) ======

class OrdenProduccionBase(BaseModel):
    fecha: Optional[datetime] = None
    observaciones: Optional[str] = None

class OrdenProduccionCreate(OrdenProduccionBase):
    insumos: List[OpInsumoCreate]
    productos: List[OpProductoCreate]

class OrdenProduccionResponse(OrdenProduccionBase):
    id: int
    numero: int
    fecha: datetime
    fecha_cierre: Optional[datetime] = None
    usuario_id: int
    estado: str
    insumos: List[OpInsumoResponse]
    productos: List[OpProductoResponse]

    class Config:
        from_attributes = True

# ====== CIERRE (cantidades reales) ======

class OpCierreInsumo(BaseModel):
    id: int  # id del renglón op_insumos
    cantidad_real: float
    nro_lote: Optional[str] = None

class OpCierreProducto(BaseModel):
    id: int  # id del renglón op_productos
    cantidad_real: float
    nro_lote_generado: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None

class OrdenProduccionCierre(BaseModel):
    insumos: List[OpCierreInsumo]
    productos: List[OpCierreProducto]
