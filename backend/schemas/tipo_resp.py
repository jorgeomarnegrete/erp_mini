from pydantic import BaseModel

class TipoRespBase(BaseModel):
    nombre: str
    abreviatura: str
    codigo_arca: str
    activo: bool = True

class TipoRespCreate(TipoRespBase):
    pass

class TipoRespUpdate(BaseModel):
    nombre: str | None = None
    abreviatura: str | None = None
    codigo_arca: str | None = None
    activo: bool | None = None

class TipoRespResponse(TipoRespBase):
    id: int

    class Config:
        from_attributes = True
