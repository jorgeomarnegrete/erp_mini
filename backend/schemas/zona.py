from pydantic import BaseModel

class ZonaBase(BaseModel):
    nombre: str
    activa: bool = True

class ZonaCreate(ZonaBase):
    pass

class ZonaUpdate(BaseModel):
    nombre: str | None = None
    activa: bool | None = None

class ZonaResponse(ZonaBase):
    id: int

    class Config:
        from_attributes = True
