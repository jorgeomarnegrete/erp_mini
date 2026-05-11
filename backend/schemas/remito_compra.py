from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.proveedor import ProveedorResponse
from schemas.producto import ProductoResponse

# ====== DETALLES (Renglones) ======

class RemitoCompraDetalleBase(BaseModel):
    producto_id: int
    cantidad: float
    precio_unitario: float
    subtotal: float
    nro_lote: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None

class RemitoCompraDetalleCreate(RemitoCompraDetalleBase):
    pass

class RemitoCompraDetalleResponse(RemitoCompraDetalleBase):
    id: int
    remito_compra_id: int
    cantidad_recibida: float
    producto: Optional[ProductoResponse] = None

    class Config:
        from_attributes = True

# ====== CABECERA (Remito) ======

class RemitoCompraBase(BaseModel):
    proveedor_id: int
    numero_remito: str
    afecta_stock: bool = True
    observaciones: Optional[str] = None
    total: float = 0.0

class RemitoCompraCreate(RemitoCompraBase):
    detalles: List[RemitoCompraDetalleCreate]

class RemitoCompraResponse(RemitoCompraBase):
    id: int
    fecha: datetime
    usuario_id: int
    
    proveedor: Optional[ProveedorResponse] = None
    detalles: List[RemitoCompraDetalleResponse]

    class Config:
        from_attributes = True
