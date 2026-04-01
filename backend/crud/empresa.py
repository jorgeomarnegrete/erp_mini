from sqlalchemy.orm import Session
from models.empresa import Empresa
from schemas.empresa import EmpresaUpdate

def get_empresa(db: Session):
    return db.query(Empresa).filter(Empresa.id == 1).first()

def update_empresa(db: Session, record_update: EmpresaUpdate):
    db_record = db.query(Empresa).filter(Empresa.id == 1).first()
    if not db_record:
        # Create it if it desperately didn't exist for some reason
        db_record = Empresa(id=1, **record_update.model_dump())
        db.add(db_record)
    else:
        for key, value in record_update.model_dump().items():
            setattr(db_record, key, value)
            
    db.commit()
    db.refresh(db_record)
    return db_record
