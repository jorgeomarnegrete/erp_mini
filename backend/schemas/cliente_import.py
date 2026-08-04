from pydantic import BaseModel
from typing import List, Optional


class ImportClientePreview(BaseModel):
    codigo_interno: str
    razon_social: str
    documento: Optional[str] = None
    clasificacion: str  # vincular | nuevo | sin_cambios | sin_documento | ambiguo
    motivo: Optional[str] = None


class ImportClienteResumen(BaseModel):
    a_vincular: int
    nuevos: int
    sin_cambios: int
    sin_documento: int
    ambiguos: int
    clientes: List[ImportClientePreview]


class ImportClienteConfirmarResponse(BaseModel):
    vinculados: int
    creados: int
