from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.vendedor import VendedorCreate, VendedorUpdate, VendedorResponse
from crud import vendedor as crud_vend
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/vendedores", tags=["vendedor"])

@router.get("", response_model=list[VendedorResponse])
async def read_all_vendedores(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_vend.get_all(db)

@router.post("", response_model=VendedorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendedor(vend_in: VendedorCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    if vend_in.user_id:
        db_user_link = crud_vend.get_by_user_id(db, user_id=vend_in.user_id)
        if db_user_link:
            raise HTTPException(status_code=400, detail="Este Usuario de Sistema ya está enlazado a otro Vendedor.")
    
    return crud_vend.create(db=db, record_in=vend_in)

@router.put("/{record_id}", response_model=VendedorResponse)
async def update_vendedor(record_id: int, vend_in: VendedorUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_vend.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado.")
    
    if vend_in.user_id is not None and vend_in.user_id != db_record.user_id:
        check_link = crud_vend.get_by_user_id(db, user_id=vend_in.user_id)
        if check_link:
            raise HTTPException(status_code=400, detail="Este Sistema Usuario ya pertenece a otro Vendedor.")
            
    return crud_vend.update(db=db, db_record=db_record, record_update=vend_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendedor(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_vend.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Vendedor Inexistente.")
        
    crud_vend.delete(db=db, db_record=db_record)
    return None
