from sqlalchemy import Column, Integer, String, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

user_menus = Table("user_menus", Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("menu_id", Integer, ForeignKey("menus.id"))
)

class Menu(Base):
    __tablename__ = "menus"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    ruta = Column(String, nullable=True)
    icono = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("menus.id"), nullable=True)
    orden = Column(Integer, default=0)

    parent = relationship("Menu", remote_side=[id], backref="submenus")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)

    menus = relationship("Menu", secondary=user_menus, backref="users")
