from pydantic import BaseModel
from typing import Optional

class TransporteBase(BaseModel):
    codigo_tango: Optional[str] = None
    nombre: str
    cuit: Optional[str] = None
    domicilio: Optional[str] = None
    localidad: Optional[str] = None
    telefono: Optional[str] = None

class TransporteCreate(TransporteBase):
    pass

class TransporteUpdate(BaseModel):
    codigo_tango: Optional[str] = None
    nombre: Optional[str] = None
    cuit: Optional[str] = None
    domicilio: Optional[str] = None
    localidad: Optional[str] = None
    telefono: Optional[str] = None

class TransporteResponse(TransporteBase):
    id: int

    class Config:
        from_attributes = True
