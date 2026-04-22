from pydantic import BaseModel
from typing import Optional
from schemas.tipo_doc import TipoDocResponse
from schemas.tipo_resp import TipoRespResponse

class ProveedorBase(BaseModel):
    razon_social: str
    nombre_fantasia: Optional[str] = None
    tipo_doc_id: int
    documento: str
    tipo_resp_id: int
    
    provincia: Optional[str] = None
    localidad: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    
    telefono: Optional[str] = None
    email: Optional[str] = None
    
    contacto_nombre: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_email: Optional[str] = None
    
    cbu_alias: Optional[str] = None
    condicion_pago_defecto: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(BaseModel):
    razon_social: Optional[str] = None
    nombre_fantasia: Optional[str] = None
    tipo_doc_id: Optional[int] = None
    documento: Optional[str] = None
    tipo_resp_id: Optional[int] = None
    
    provincia: Optional[str] = None
    localidad: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    
    telefono: Optional[str] = None
    email: Optional[str] = None
    
    contacto_nombre: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_email: Optional[str] = None
    
    cbu_alias: Optional[str] = None
    condicion_pago_defecto: Optional[str] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None

class ProveedorResponse(ProveedorBase):
    id: int
    tipo_doc: TipoDocResponse
    tipo_resp: TipoRespResponse

    class Config:
        from_attributes = True
