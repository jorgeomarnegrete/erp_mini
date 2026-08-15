from sqlalchemy.orm import Session
from datetime import date, timedelta

from models.vencimiento import Vencimiento
from schemas.vencimiento import VencimientoCreate, VencimientoUpdate

def get_by_entidad(db: Session, entidad_tipo: str, entidad_id: int):
    return db.query(Vencimiento).filter(
        Vencimiento.entidad_tipo == entidad_tipo,
        Vencimiento.entidad_id == entidad_id
    ).order_by(Vencimiento.fecha_vencimiento.asc()).all()

def create(db: Session, data: VencimientoCreate):
    db_record = Vencimiento(**data.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: Vencimiento, data: VencimientoUpdate):
    update_data = data.model_dump(exclude_unset=True)

    # Si se reprograma la fecha, el vencimiento deja de estar resuelto
    nueva_fecha = update_data.get("fecha_vencimiento")
    if nueva_fecha is not None and nueva_fecha != db_record.fecha_vencimiento:
        update_data["finalizado"] = False

    for key, value in update_data.items():
        setattr(db_record, key, value)

    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: Vencimiento):
    db.delete(db_record)
    db.commit()

def count_proximos(db: Session) -> int:
    """Vencimientos no finalizados cuya fecha ya entró en su propia ventana de aviso"""
    hoy = date.today()
    pendientes = db.query(Vencimiento).filter(Vencimiento.finalizado == False).all()
    return sum(1 for v in pendientes if v.fecha_vencimiento <= hoy + timedelta(days=v.avisar_dias_antes))

def get_for_reporte(db: Session, fecha_desde: date, fecha_hasta: date, responsable_id: int | None = None, entidad_tipo: str | None = None):
    query = db.query(Vencimiento).filter(
        Vencimiento.fecha_vencimiento >= fecha_desde,
        Vencimiento.fecha_vencimiento <= fecha_hasta
    )
    if responsable_id is not None:
        query = query.filter(Vencimiento.responsable_id == responsable_id)
    if entidad_tipo is not None:
        query = query.filter(Vencimiento.entidad_tipo == entidad_tipo)
    return query.order_by(Vencimiento.fecha_vencimiento.asc()).all()
