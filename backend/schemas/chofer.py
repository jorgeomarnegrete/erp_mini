from pydantic import BaseModel

class ChoferBase(BaseModel):
    nombre: str

class ChoferCreate(ChoferBase):
    pass

class ChoferUpdate(BaseModel):
    nombre: str | None = None

class ChoferResponse(ChoferBase):
    id: int

    class Config:
        from_attributes = True
