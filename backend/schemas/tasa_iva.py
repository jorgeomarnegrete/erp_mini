from pydantic import BaseModel

class TasaIvaBase(BaseModel):
    nombre: str
    valor: float
    codigo_arca: str
    activo: bool = True

class TasaIvaCreate(TasaIvaBase):
    pass

class TasaIvaUpdate(BaseModel):
    nombre: str | None = None
    valor: float | None = None
    codigo_arca: str | None = None
    activo: bool | None = None

class TasaIvaResponse(TasaIvaBase):
    id: int

    class Config:
        from_attributes = True
