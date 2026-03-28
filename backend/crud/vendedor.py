from sqlalchemy.orm import Session
from models.vendedor import Vendedor
from schemas.vendedor import VendedorCreate, VendedorUpdate

def get_all(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Vendedor).order_by(Vendedor.id.asc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(Vendedor).filter(Vendedor.id == record_id).first()

def get_by_user_id(db: Session, user_id: int):
    return db.query(Vendedor).filter(Vendedor.user_id == user_id).first()

def create(db: Session, record_in: VendedorCreate):
    db_record = Vendedor(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: Vendedor, record_update: VendedorUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: Vendedor):
    db.delete(db_record)
    db.commit()
    return db_record
