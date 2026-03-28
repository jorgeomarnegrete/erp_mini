from pydantic import BaseModel

class TipoDocBase(BaseModel):
    nombre: str
    abreviatura: str
    codigo_arca: str
    activo: bool = True

class TipoDocCreate(TipoDocBase):
    pass

class TipoDocUpdate(BaseModel):
    nombre: str | None = None
    abreviatura: str | None = None
    codigo_arca: str | None = None
    activo: bool | None = None

class TipoDocResponse(TipoDocBase):
    id: int

    class Config:
        from_attributes = True
