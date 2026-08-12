from sqlalchemy import Column, Integer, String
from database import Base

class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String, index=True, nullable=False)
    patente = Column(String, nullable=True)
