from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.cliente import ClienteResponse
from schemas.vendedor import VendedorResponse
from schemas.punto_venta import PuntoVentaResponse
from schemas.producto import ProductoResponse

# ====== DETALLES (Renglones) ======

class CotizacionDetalleBase(BaseModel):
    producto_id: int
    descripcion: str
    cantidad: float
    precio_unitario: float
    subtotal: float

class CotizacionDetalleCreate(CotizacionDetalleBase):
    pass

class CotizacionDetalleResponse(CotizacionDetalleBase):
    id: int
    cotizacion_id: int
    producto: ProductoResponse

    class Config:
        from_attributes = True

# ====== CABECERA (Cotizacion) ======

class CotizacionBase(BaseModel):
    punto_venta_id: int
    cliente_id: int
    vendedor_id: Optional[int] = None
    observaciones: Optional[str] = None
    estado: str = "Borrador"
    
    subtotal: float
    descuento_porcentaje: float = 0.0
    descuento_monto: float = 0.0
    total: float

class CotizacionCreate(CotizacionBase):
    detalles: List[CotizacionDetalleCreate]

class CotizacionResponse(CotizacionBase):
    id: int
    fecha_emision: datetime
    numero_comprobante: int
    
    punto_venta: PuntoVentaResponse
    cliente: ClienteResponse
    vendedor: Optional[VendedorResponse] = None
    detalles: List[CotizacionDetalleResponse]

    class Config:
        from_attributes = True
