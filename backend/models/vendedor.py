from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from database import Base

class Vendedor(Base):
    __tablename__ = "vendedores"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    porcentaje_comision = Column(Float, default=0.0, nullable=False)
    
    # Llave foránea opcional por si el administrador desea que este vendedor pueda loguearse al programa
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)
    
    activo = Column(Boolean, default=True)
