from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class ListaPrecio(Base):
    __tablename__ = "lista_precio"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    porcentaje_ganancia = Column(Float, default=0.0, nullable=False)
    activo = Column(Boolean, default=True)
