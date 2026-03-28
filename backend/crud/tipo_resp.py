from sqlalchemy.orm import Session
from models.tipo_resp import TipoResp
from schemas.tipo_resp import TipoRespCreate, TipoRespUpdate

def get_all(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TipoResp).order_by(TipoResp.id.asc()).offset(skip).limit(limit).all()

def get_by_id(db: Session, record_id: int):
    return db.query(TipoResp).filter(TipoResp.id == record_id).first()

def get_by_codigo(db: Session, codigo_arca: str):
    return db.query(TipoResp).filter(TipoResp.codigo_arca == codigo_arca).first()

def create(db: Session, record_in: TipoRespCreate):
    db_record = TipoResp(**record_in.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: TipoResp, record_update: TipoRespUpdate):
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: TipoResp):
    # En proyectos grandes solemos no borrar, sino actualizar db_record.activo = False
    # Pero aquí proveemos la eliminación física por si el usuario se equivocó al crearlo
    db.delete(db_record)
    db.commit()
    return db_record
