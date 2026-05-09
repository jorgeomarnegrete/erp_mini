from sqlalchemy import Column, Integer, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class CargaPreparacion(Base):
    __tablename__ = "carga_preparacion"
    
    id = Column(Integer, primary_key=True, index=True)
    transporte_id = Column(Integer, ForeignKey("transportes.id"), index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    cantidad = Column(Float, nullable=False)
    preparado = Column(Boolean, default=False)
    
    transporte = relationship("Transporte")
    producto = relationship("Producto")
    usuario = relationship("User")
