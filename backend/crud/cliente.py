from sqlalchemy.orm import Session
from models.cliente import Cliente
from schemas.cliente import ClienteCreate, ClienteUpdate

def get_all(db: Session, skip: int = 0, limit: int = 10000):
    # La validación lazy="joined" en models/cliente.py auto-carga las relaciones subyacentes
    return db.query(Cliente).order_by(Cliente.id.asc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(Cliente).filter(Cliente.id == record_id).first()

def get_by_documento(db: Session, documento: str):
    return db.query(Cliente).filter(Cliente.documento == documento).first()

def create(db: Session, record_in: ClienteCreate):
    db_record = Cliente(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: Cliente, record_update: ClienteUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: Cliente):
    db.delete(db_record)
    db.commit()
    return db_record
