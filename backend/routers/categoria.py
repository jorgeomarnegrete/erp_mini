from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaResponse
from crud import categoria as crud_cat
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/categorias", tags=["categoria"])

@router.get("", response_model=list[CategoriaResponse])
async def read_all_cats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lectura general del padrón de Categorias / Rubros"""
    return crud_cat.get_all(db)

@router.post("", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_cat(cat_in: CategoriaCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Crear un Rubro (Solo Admin o Encargados autorizados a crear familia de productos)"""
    db_record = crud_cat.get_by_nombre(db, nombre=cat_in.nombre)
    if db_record:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre.")
        
    return crud_cat.create(db=db, record_in=cat_in)

@router.put("/{record_id}", response_model=CategoriaResponse)
async def update_cat(record_id: int, cat_in: CategoriaUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Actualización de Categorías"""
    db_record = crud_cat.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Rubro Inexistente.")
    
    if cat_in.nombre is not None and cat_in.nombre != db_record.nombre:
        check_nom = crud_cat.get_by_nombre(db, nombre=cat_in.nombre)
        if check_nom:
            raise HTTPException(status_code=400, detail="Este Nombre ya está ocupado.")
            
    return crud_cat.update(db=db, db_record=db_record, record_update=cat_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cat(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_cat.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Rubro NO Encontrado.")
        
    crud_cat.delete(db=db, db_record=db_record)
    return None
