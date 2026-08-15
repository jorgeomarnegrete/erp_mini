from pydantic import BaseModel

class SubfamiliaBase(BaseModel):
    nombre: str
    activo: bool = True

class SubfamiliaCreate(SubfamiliaBase):
    pass

class SubfamiliaUpdate(BaseModel):
    nombre: str | None = None
    activo: bool | None = None

class SubfamiliaResponse(SubfamiliaBase):
    id: int

    class Config:
        from_attributes = True
