from pydantic import BaseModel
from typing import List, Optional

class MenuBase(BaseModel):
    id: int
    nombre: str
    ruta: str | None = None
    icono: str | None = None
    parent_id: int | None = None
    orden: int

    class Config:
        from_attributes = True

class MenuTree(MenuBase):
    submenus: List['MenuTree'] = []

MenuTree.model_rebuild()

class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str | None = None
    is_admin: bool
    menus: List[MenuBase] = []

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    nombre: str | None = None
    password: str
    is_admin: bool = False
    menu_ids: List[int] = []

class UserUpdate(BaseModel):
    email: str | None = None
    nombre: str | None = None
    password: str | None = None
    is_admin: bool | None = None
    menu_ids: List[int] | None = None

class Token(BaseModel):
    access_token: str
    token_type: str
