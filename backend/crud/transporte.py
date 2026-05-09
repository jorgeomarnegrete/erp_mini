from sqlalchemy.orm import Session
from models.transporte import Transporte
from schemas.transporte import TransporteCreate, TransporteUpdate

def get_transportes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Transporte).offset(skip).limit(limit).all()

def get_transporte(db: Session, transporte_id: int):
    return db.query(Transporte).filter(Transporte.id == transporte_id).first()

def create_transporte(db: Session, transporte: TransporteCreate):
    data = transporte.dict()
    if not data.get('codigo_tango'):
        data['codigo_tango'] = None
    db_transporte = Transporte(**data)
    db.add(db_transporte)
    db.commit()
    db.refresh(db_transporte)
    return db_transporte

def update_transporte(db: Session, transporte_id: int, transporte: TransporteUpdate):
    db_transporte = get_transporte(db, transporte_id)
    if not db_transporte:
        return None
    
    update_data = transporte.dict(exclude_unset=True)
    if 'codigo_tango' in update_data and not update_data['codigo_tango']:
        update_data['codigo_tango'] = None
        
    for key, value in update_data.items():
        setattr(db_transporte, key, value)
    
    db.commit()
    db.refresh(db_transporte)
    return db_transporte

def delete_transporte(db: Session, transporte_id: int):
    db_transporte = get_transporte(db, transporte_id)
    if not db_transporte:
        return False
    
    db.delete(db_transporte)
    db.commit()
    return True
