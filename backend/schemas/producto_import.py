from pydantic import BaseModel
from typing import List, Optional


class ImportProductoPreview(BaseModel):
    codigo_interno: str
    nombre: str
    familia: Optional[str] = None
    categoria_nueva: Optional[str] = None
    clasificacion: str  # nuevo | sin_cambios | sin_codigo
    motivo: Optional[str] = None


class ImportProductoResumen(BaseModel):
    nuevos: int
    sin_cambios: int
    sin_codigo: int
    categorias_nuevas: List[str]
    productos: List[ImportProductoPreview]


class ImportProductoConfirmarResponse(BaseModel):
    creados: int
    categorias_creadas: int
