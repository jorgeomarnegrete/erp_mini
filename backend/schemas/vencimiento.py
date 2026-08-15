from pydantic import BaseModel
from datetime import date

class ResponsableMini(BaseModel):
    id: int
    nombre: str | None = None
    email: str

    class Config:
        from_attributes = True

class VencimientoBase(BaseModel):
    entidad_tipo: str
    entidad_id: int
    tipo_documento: str
    fecha_vencimiento: date
    responsable_id: int
    avisar_dias_antes: int = 15
    observaciones: str | None = None

class VencimientoCreate(VencimientoBase):
    pass

class VencimientoUpdate(BaseModel):
    tipo_documento: str | None = None
    fecha_vencimiento: date | None = None
    responsable_id: int | None = None
    avisar_dias_antes: int | None = None
    finalizado: bool | None = None
    observaciones: str | None = None

class VencimientoResponse(VencimientoBase):
    id: int
    finalizado: bool
    responsable: ResponsableMini

    class Config:
        from_attributes = True
