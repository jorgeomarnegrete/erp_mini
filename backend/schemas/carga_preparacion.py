from pydantic import BaseModel
from typing import Optional
from schemas.producto import ProductoResponse

class CargaPreparacionBase(BaseModel):
    transporte_id: int
    producto_id: int
    user_id: int
    cantidad: float
    preparado: bool = False

class CargaPreparacionResponse(CargaPreparacionBase):
    id: int
    producto: Optional[ProductoResponse] = None

    class Config:
        from_attributes = True
