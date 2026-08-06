from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class StkMovItem(BaseModel):
    id_producto: int
    cantidad: float
    nro_lote: Optional[str] = None

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
    nro_lote: Optional[str] = None

    class Config:
        orm_mode = True

class StkMovReporteItem(BaseModel):
    id_mov: int
    fecha_hora: datetime
    tipo: int
    motivo: str
    cantidad: float
    nro_lote: Optional[str] = None
    producto_codigo: str
    producto_nombre: str
    usuario_nombre: str

class StkMovReporteResponse(BaseModel):
    items: List[StkMovReporteItem]
    total: int
