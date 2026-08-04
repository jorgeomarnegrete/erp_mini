from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ImportLineaPreview(BaseModel):
    codigo_articulo: str
    descripcion: str
    cantidad: float
    precio_unitario: float

class ImportPedidoPreview(BaseModel):
    origen_externo: str
    cliente_codigo: str
    cliente_nombre: str
    fecha: Optional[datetime] = None
    estado_erp: str
    clasificacion: str  # nuevo | modificado | sin_cambios | error | ignorado_estado
    motivo: Optional[str] = None
    total: float
    lineas: List[ImportLineaPreview]

class ImportResumen(BaseModel):
    nuevos: int
    modificados: int
    sin_cambios: int
    errores: int
    ignorados_estado: int
    pedidos: List[ImportPedidoPreview]

class ImportConfirmarResponse(BaseModel):
    creados: int
    actualizados: int
