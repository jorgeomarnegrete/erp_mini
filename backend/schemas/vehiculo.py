from pydantic import BaseModel

class VehiculoBase(BaseModel):
    descripcion: str
    patente: str | None = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(BaseModel):
    descripcion: str | None = None
    patente: str | None = None

class VehiculoResponse(VehiculoBase):
    id: int

    class Config:
        from_attributes = True
