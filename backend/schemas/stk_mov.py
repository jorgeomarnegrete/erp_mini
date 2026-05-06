from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class StkMovItem(BaseModel):
    id_producto: int
    cantidad: float

class StkMovCreate(BaseModel):
    tipo: int
    motivo: str
    items: List[StkMovItem]

class StkMovOut(BaseModel):
    id_mov: int
    fecha_hora: datetime
    id_usuario: int
    id_producto: int
    motivo: str
    cantidad: float
    tipo: int

    class Config:
        orm_mode = True
