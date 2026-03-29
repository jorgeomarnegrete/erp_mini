from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Categoria(Base):
    __tablename__ = "categorias_rubros"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    descripcion = Column(String, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
