from sqlalchemy import Column, Integer, String, Date, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Vencimiento(Base):
    """
    Vencimiento de un trámite/documento asociado a un Vehículo o Chofer
    (SENASA, Service, Registro de Conducir, Carnet de Manipulación, etc.)

    Tabla única con entidad_tipo/entidad_id como discriminador polimórfico,
    en vez de una tabla por tipo de entidad, para que la alerta del
    Dashboard sea una sola consulta.
    """
    __tablename__ = "vencimientos"

    id = Column(Integer, primary_key=True, index=True)
    entidad_tipo = Column(String, nullable=False, index=True)  # "vehiculo" | "chofer"
    entidad_id = Column(Integer, nullable=False, index=True)

    tipo_documento = Column(String, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)

    responsable_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    avisar_dias_antes = Column(Integer, nullable=False, default=15)
    finalizado = Column(Boolean, nullable=False, default=False)
    observaciones = Column(Text, nullable=True)

    responsable = relationship("User", lazy="joined")
