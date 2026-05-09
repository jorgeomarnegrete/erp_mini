from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.cliente import ClienteResponse
from schemas.punto_venta import PuntoVentaResponse
from schemas.producto import ProductoResponse

# ====== DETALLES (Renglones) ======

class RemitoDetalleBase(BaseModel):
    producto_id: int
    id_pedido_detalle: Optional[int] = None
    cantidad: float
    precio_unitario: float
    subtotal: float

class RemitoDetalleCreate(RemitoDetalleBase):
    pass

class RemitoDetalleResponse(RemitoDetalleBase):
    id: int
    remito_id: int
    producto: Optional[ProductoResponse] = None

    class Config:
        from_attributes = True

# ====== CABECERA (Remito) ======

class RemitoBase(BaseModel):
    punto_venta_id: int
    cliente_id: int
    pedido_id: Optional[int] = None
    descuenta_stock: bool = True
    observaciones: Optional[str] = None
    total: float = 0.0

class RemitoCreate(RemitoBase):
    detalles: List[RemitoDetalleCreate]

class RemitoResponse(RemitoBase):
    id: int
    fecha: datetime
    numero_comprobante: int
    usuario_id: int
    
    punto_venta: Optional[PuntoVentaResponse] = None
    cliente: Optional[ClienteResponse] = None
    detalles: List[RemitoDetalleResponse]

    class Config:
        from_attributes = True

class RemitoBulkAssign(BaseModel):
    remito_ids: List[int]
    transporte_id: int
