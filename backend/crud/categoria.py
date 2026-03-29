from sqlalchemy.orm import Session
from models.categoria import Categoria
from schemas.categoria import CategoriaCreate, CategoriaUpdate

def get_all(db: Session, skip: int = 0, limit: int = 200):
    return db.query(Categoria).order_by(Categoria.nombre.asc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(Categoria).filter(Categoria.id == record_id).first()

def get_by_nombre(db: Session, nombre: str):
    return db.query(Categoria).filter(Categoria.nombre == nombre).first()

def create(db: Session, record_in: CategoriaCreate):
    db_record = Categoria(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: Categoria, record_update: CategoriaUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: Categoria):
    db.delete(db_record)
    db.commit()
    return db_record
