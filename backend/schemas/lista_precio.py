from pydantic import BaseModel

class ListaPrecioBase(BaseModel):
    nombre: str
    porcentaje_ganancia: float = 0.0
    activo: bool = True

class ListaPrecioCreate(ListaPrecioBase):
    pass

class ListaPrecioUpdate(BaseModel):
    nombre: str | None = None
    porcentaje_ganancia: float | None = None
    activo: bool | None = None

class ListaPrecioResponse(ListaPrecioBase):
    id: int

    class Config:
        from_attributes = True
