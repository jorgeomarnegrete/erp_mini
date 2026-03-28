from pydantic import BaseModel
from typing import Optional

class VendedorBase(BaseModel):
    nombre: str
    apellido: str
    porcentaje_comision: float = 0.0
    user_id: Optional[int] = None
    activo: bool = True

class VendedorCreate(VendedorBase):
    pass

class VendedorUpdate(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    porcentaje_comision: float | None = None
    user_id: Optional[int] = None
    activo: bool | None = None

class VendedorResponse(VendedorBase):
    id: int

    class Config:
        from_attributes = True
