from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.cliente import ClienteResponse
from schemas.punto_venta import PuntoVentaResponse
from schemas.producto import ProductoResponse
from schemas.transporte import TransporteResponse
from schemas.vehiculo import VehiculoResponse
from schemas.chofer import ChoferResponse

# ====== DETALLES (Renglones) ======

class DevolucionDetalleBase(BaseModel):
    producto_id: int
    cantidad: float
    nro_lote: Optional[str] = None

class DevolucionDetalleCreate(DevolucionDetalleBase):
    pass

class DevolucionDetalleResponse(DevolucionDetalleBase):
    id: int
    devolucion_id: int
    producto: Optional[ProductoResponse] = None

    class Config:
        from_attributes = True

# ====== CABECERA (Devolución) ======

class DevolucionBase(BaseModel):
    punto_venta_id: int
    cliente_id: int
    vehiculo_id: Optional[int] = None
    chofer_id: Optional[int] = None
    motivo: str
    observaciones: Optional[str] = None

class DevolucionCreate(DevolucionBase):
    detalles: List[DevolucionDetalleCreate]

class DevolucionResponse(DevolucionBase):
    id: int
    fecha: datetime
    numero_comprobante: int
    usuario_id: int

    punto_venta: Optional[PuntoVentaResponse] = None
    cliente: Optional[ClienteResponse] = None
    transporte: Optional[TransporteResponse] = None
    vehiculo: Optional[VehiculoResponse] = None
    chofer: Optional[ChoferResponse] = None
    detalles: List[DevolucionDetalleResponse]

    class Config:
        from_attributes = True

class DevolucionListResponse(BaseModel):
    items: List[DevolucionResponse]
    total: int
