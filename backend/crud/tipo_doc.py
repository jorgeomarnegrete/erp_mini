from sqlalchemy.orm import Session
from models.tipo_doc import TipoDoc
from schemas.tipo_doc import TipoDocCreate, TipoDocUpdate

def get_all(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TipoDoc).order_by(TipoDoc.id.asc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(TipoDoc).filter(TipoDoc.id == record_id).first()

def get_by_codigo(db: Session, codigo_arca: str):
    return db.query(TipoDoc).filter(TipoDoc.codigo_arca == codigo_arca).first()

def create(db: Session, record_in: TipoDocCreate):
    db_record = TipoDoc(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: TipoDoc, record_update: TipoDocUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: TipoDoc):
    db.delete(db_record)
    db.commit()
    return db_record
