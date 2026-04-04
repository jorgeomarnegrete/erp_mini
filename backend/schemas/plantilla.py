from pydantic import BaseModel

class PlantillaBase(BaseModel):
    nombre: str
    tipo_documento: str
    codigo_html: str
    activa: bool = True

class PlantillaCreate(PlantillaBase):
    pass

class PlantillaResponse(PlantillaBase):
    id: int

    class Config:
        from_attributes = True
