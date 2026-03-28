from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.tipo_resp import TipoRespCreate, TipoRespUpdate, TipoRespResponse
from crud import tipo_resp as crud_tr
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/tipos-resp", tags=["tipo_resp"])

@router.get("", response_model=list[TipoRespResponse])
async def read_all_tipos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Todos pueden leer la tabla (Ej. cajeros para crear un nuevo cliente)."""
    return crud_tr.get_all(db)

@router.post("", response_model=TipoRespResponse, status_code=status.HTTP_201_CREATED)
async def create_tipo(tipo_in: TipoRespCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_tr.get_by_codigo(db, codigo_arca=tipo_in.codigo_arca)
    if db_record:
        raise HTTPException(status_code=400, detail="El código de ARCA ya está registrado.")
    return crud_tr.create(db=db, record_in=tipo_in)

@router.put("/{record_id}", response_model=TipoRespResponse)
async def update_tipo(record_id: int, tipo_in: TipoRespUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_tr.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Tipo de Responsable no encontrado")
    
    if tipo_in.codigo_arca is not None and tipo_in.codigo_arca != db_record.codigo_arca:
        check_codigo = crud_tr.get_by_codigo(db, codigo_arca=tipo_in.codigo_arca)
        if check_codigo:
            raise HTTPException(status_code=400, detail="Este Código ARCA ya le pertenece a otro registro.")
            
    return crud_tr.update(db=db, db_record=db_record, record_update=tipo_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tipo(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_tr.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
        
    crud_tr.delete(db=db, db_record=db_record)
    return None
