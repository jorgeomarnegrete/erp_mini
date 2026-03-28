from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.lista_precio import ListaPrecioCreate, ListaPrecioUpdate, ListaPrecioResponse
from crud import lista_precio as crud_lp
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/listas-precios", tags=["lista_precio"])

@router.get("", response_model=list[ListaPrecioResponse])
async def read_all_listas(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_lp.get_all(db)

@router.post("", response_model=ListaPrecioResponse, status_code=status.HTTP_201_CREATED)
async def create_lista(tipo_in: ListaPrecioCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_lp.get_by_nombre(db, nombre=tipo_in.nombre)
    if db_record:
        raise HTTPException(status_code=400, detail="Esta Lista de Precios ya existe.")
    return crud_lp.create(db=db, record_in=tipo_in)

@router.put("/{record_id}", response_model=ListaPrecioResponse)
async def update_lista(record_id: int, tipo_in: ListaPrecioUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_lp.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Lista de Precio no encontrada")
    
    if tipo_in.nombre is not None and tipo_in.nombre != db_record.nombre:
        check_nombre = crud_lp.get_by_nombre(db, nombre=tipo_in.nombre)
        if check_nombre:
            raise HTTPException(status_code=400, detail="El Nuevo Nombre asignado ya le pertenece a otra Lista.")
            
    return crud_lp.update(db=db, db_record=db_record, record_update=tipo_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lista(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_lp.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
        
    crud_lp.delete(db=db, db_record=db_record)
    return None
