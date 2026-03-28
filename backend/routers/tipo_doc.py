from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.tipo_doc import TipoDocCreate, TipoDocUpdate, TipoDocResponse
from crud import tipo_doc as crud_td
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/tipos-doc", tags=["tipo_doc"])

@router.get("", response_model=list[TipoDocResponse])
async def read_all_tipos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lectura general asimilada al modulo clientes"""
    return crud_td.get_all(db)

@router.post("", response_model=TipoDocResponse, status_code=status.HTTP_201_CREATED)
async def create_tipo(tipo_in: TipoDocCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_td.get_by_codigo(db, codigo_arca=tipo_in.codigo_arca)
    if db_record:
        raise HTTPException(status_code=400, detail="El código de Documento de ARCA ya está registrado.")
    return crud_td.create(db=db, record_in=tipo_in)

@router.put("/{record_id}", response_model=TipoDocResponse)
async def update_tipo(record_id: int, tipo_in: TipoDocUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_td.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Tipo de Documento no encontrado")
    
    if tipo_in.codigo_arca is not None and tipo_in.codigo_arca != db_record.codigo_arca:
        check_codigo = crud_td.get_by_codigo(db, codigo_arca=tipo_in.codigo_arca)
        if check_codigo:
            raise HTTPException(status_code=400, detail="Este Código ARCA ya le pertenece a otro registro.")
            
    return crud_td.update(db=db, db_record=db_record, record_update=tipo_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tipo(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_td.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
        
    crud_td.delete(db=db, db_record=db_record)
    return None
