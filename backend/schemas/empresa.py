from pydantic import BaseModel
from datetime import date
from typing import Optional
from schemas.tipo_resp import TipoRespResponse

class EmpresaBase(BaseModel):
    razon_social: str
    nombre_fantasia: Optional[str] = None
    cuit: str
    ingresos_brutos: Optional[str] = None
    fecha_inicio_actividades: Optional[date] = None
    tipo_resp_id: int
    
    domicilio_comercial: str
    provincia: Optional[str] = None
    localidad: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    
    logo_base64: Optional[str] = None

class EmpresaUpdate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id: int
    tipo_resp: TipoRespResponse

    class Config:
        from_attributes = True
