from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Subfamilia(Base):
    __tablename__ = "subfamilias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
