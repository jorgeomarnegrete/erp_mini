from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.cliente import ClienteResponse
from schemas.vendedor import VendedorResponse
from schemas.punto_venta import PuntoVentaResponse
from schemas.producto import ProductoResponse

# ====== DETALLES (Renglones) ======

class PedidoDetalleBase(BaseModel):
    producto_id: int
    leyenda: Optional[str] = None
    cantidad: float
    precio_unitario: float
    entregado: float = 0.0
    subtotal: float

class PedidoDetalleCreate(PedidoDetalleBase):
    pass

class PedidoDetalleResponse(PedidoDetalleBase):
    id: int
    pedido_id: int
    producto: ProductoResponse

    class Config:
        from_attributes = True

# ====== CABECERA (Pedido) ======

class PedidoBase(BaseModel):
    punto_venta_id: int
    cliente_id: int
    vendedor_id: Optional[int] = None
    observaciones: Optional[str] = None
    fecha_entrega: Optional[datetime] = None
    estado: str = "Pendiente"
    
    subtotal: float
    descuento_porcentaje: float = 0.0
    descuento_monto: float = 0.0
    iva: float = 0.0
    total: float

class PedidoCreate(PedidoBase):
    detalles: List[PedidoDetalleCreate]

class PedidoResponse(PedidoBase):
    id: int
    fecha: datetime
    numero_comprobante: int
    usuario_id: int
    
    punto_venta: PuntoVentaResponse
    cliente: ClienteResponse
    vendedor: Optional[VendedorResponse] = None
    detalles: List[PedidoDetalleResponse]

    class Config:
        from_attributes = True
