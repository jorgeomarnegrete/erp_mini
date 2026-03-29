from sqlalchemy.orm import Session
from models.punto_venta import PuntoVenta
from schemas.punto_venta import PuntoVentaCreate, PuntoVentaUpdate

def get_all(db: Session, skip: int = 0, limit: int = 100):
    return db.query(PuntoVenta).order_by(PuntoVenta.numero.asc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(PuntoVenta).filter(PuntoVenta.id == record_id).first()

def get_by_numero(db: Session, numero: int):
    return db.query(PuntoVenta).filter(PuntoVenta.numero == numero).first()

def create(db: Session, record_in: PuntoVentaCreate):
    db_record = PuntoVenta(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: PuntoVenta, record_update: PuntoVentaUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: PuntoVenta):
    db.delete(db_record)
    db.commit()
    return db_record
