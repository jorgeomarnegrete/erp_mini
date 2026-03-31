from pydantic import BaseModel, Field

class PuntoVentaBase(BaseModel):
    numero: int = Field(gt=0, le=99999, description="Cód de 1 a 5 dígitos (ARCA)")
    descripcion: str
    facturacion_electronica: bool = False
    
    prox_cotizacion: int = 1
    prox_pedido: int = 1
    prox_factura_a: int = 1
    prox_factura_b: int = 1
    prox_factura_c: int = 1
    prox_remito: int = 1
    prox_recibo: int = 1
    
    activo: bool = True

class PuntoVentaCreate(PuntoVentaBase):
    pass

class PuntoVentaUpdate(BaseModel):
    numero: int | None = Field(None, gt=0, le=99999)
    descripcion: str | None = None
    facturacion_electronica: bool | None = None
    
    prox_cotizacion: int | None = None
    prox_pedido: int | None = None
    prox_factura_a: int | None = None
    prox_factura_b: int | None = None
    prox_factura_c: int | None = None
    prox_remito: int | None = None
    prox_recibo: int | None = None
    
    activo: bool | None = None

class PuntoVentaResponse(PuntoVentaBase):
    id: int

    class Config:
        from_attributes = True
