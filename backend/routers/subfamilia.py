from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.subfamilia import SubfamiliaCreate, SubfamiliaUpdate, SubfamiliaResponse
from crud import subfamilia as crud_subf
from routers.auth import get_current_user

router = APIRouter(prefix="/api/subfamilias", tags=["subfamilia"])

@router.get("", response_model=list[SubfamiliaResponse])
async def read_all_subfamilias(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_subf.get_all(db)

@router.post("", response_model=SubfamiliaResponse, status_code=status.HTTP_201_CREATED)
async def create_subfamilia(data: SubfamiliaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if crud_subf.get_by_nombre(db, nombre=data.nombre):
        raise HTTPException(status_code=400, detail="Ya existe una subfamilia con ese nombre.")
    return crud_subf.create(db=db, record_in=data)

@router.put("/{record_id}", response_model=SubfamiliaResponse)
async def update_subfamilia(record_id: int, data: SubfamiliaUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = crud_subf.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Subfamilia Inexistente.")

    if data.nombre is not None and data.nombre != db_record.nombre:
        if crud_subf.get_by_nombre(db, nombre=data.nombre):
            raise HTTPException(status_code=400, detail="Este Nombre ya está ocupado.")

    return crud_subf.update(db=db, db_record=db_record, record_update=data)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subfamilia(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = crud_subf.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Subfamilia NO Encontrada.")
    crud_subf.delete(db=db, db_record=db_record)
    return None
