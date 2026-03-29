from pydantic import BaseModel, Field

class PuntoVentaBase(BaseModel):
    numero: int = Field(gt=0, le=99999, description="Cód de 1 a 5 dígitos (ARCA)")
    descripcion: str
    facturacion_electronica: bool = False
    activo: bool = True

class PuntoVentaCreate(PuntoVentaBase):
    pass

class PuntoVentaUpdate(BaseModel):
    numero: int | None = Field(None, gt=0, le=99999)
    descripcion: str | None = None
    facturacion_electronica: bool | None = None
    activo: bool | None = None

class PuntoVentaResponse(PuntoVentaBase):
    id: int

    class Config:
        from_attributes = True
