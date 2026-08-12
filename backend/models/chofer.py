from sqlalchemy import Column, Integer, String
from database import Base

class Chofer(Base):
    __tablename__ = "choferes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True, nullable=False)
