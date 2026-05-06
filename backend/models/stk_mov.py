from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class StkMov(Base):
    __tablename__ = "stk_mov"
    
    id_mov = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime, default=datetime.now)
    id_usuario = Column(Integer, ForeignKey("users.id"), nullable=False)
    id_producto = Column(Integer, ForeignKey("productos.id"), nullable=False)
    motivo = Column(Text, nullable=False)
    cantidad = Column(Float, nullable=False, default=0.0)
    tipo = Column(Integer, nullable=False)  # 1 = Entrada, 2 = Salida
    
    usuario = relationship("User")
    producto = relationship("Producto")
