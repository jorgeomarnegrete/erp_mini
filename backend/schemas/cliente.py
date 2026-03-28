from pydantic import BaseModel
from typing import Optional
from schemas.tipo_doc import TipoDocResponse
from schemas.tipo_resp import TipoRespResponse
from schemas.lista_precio import ListaPrecioResponse
from schemas.vendedor import VendedorResponse

class ClienteBase(BaseModel):
    razon_social: str
    tipo_doc_id: int
    documento: str
    tipo_resp_id: int
    lista_precio_id: Optional[int] = None
    vendedor_id: Optional[int] = None
    nombre_contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    provincia: Optional[str] = None
    localidad: Optional[str] = None
    direccion: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    razon_social: str | None = None
    tipo_doc_id: int | None = None
    documento: str | None = None
    tipo_resp_id: int | None = None
    lista_precio_id: int | None = None
    vendedor_id: int | None = None
    nombre_contacto: str | None = None
    telefono_contacto: str | None = None
    email: str | None = None
    telefono: str | None = None
    provincia: str | None = None
    localidad: str | None = None
    direccion: str | None = None
    observaciones: str | None = None
    activo: bool | None = None

class ClienteResponse(ClienteBase):
    id: int
    
    # Almacenamos Nested Models para Facilidad del Frontend
    tipo_doc: Optional[TipoDocResponse] = None
    tipo_resp: Optional[TipoRespResponse] = None
    lista_precio: Optional[ListaPrecioResponse] = None
    vendedor: Optional[VendedorResponse] = None

    class Config:
        from_attributes = True
