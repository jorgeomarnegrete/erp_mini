from sqlalchemy.orm import Session
from models.tasa_iva import TasaIva
from schemas.tasa_iva import TasaIvaCreate, TasaIvaUpdate

def get_all(db: Session, skip: int = 0, limit: int = 50):
    return db.query(TasaIva).order_by(TasaIva.valor.desc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(TasaIva).filter(TasaIva.id == record_id).first()

def get_by_codigo(db: Session, codigo_arca: str):
    return db.query(TasaIva).filter(TasaIva.codigo_arca == codigo_arca).first()

def get_by_nombre(db: Session, nombre: str):
    return db.query(TasaIva).filter(TasaIva.nombre == nombre).first()

def create(db: Session, record_in: TasaIvaCreate):
    db_record = TasaIva(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: TasaIva, record_update: TasaIvaUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: TasaIva):
    db.delete(db_record)
    db.commit()
    return db_record
