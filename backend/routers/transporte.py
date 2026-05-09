from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.transporte import TransporteCreate, TransporteUpdate, TransporteResponse
from crud import transporte as crud_transporte
from routers.auth import get_current_user

router = APIRouter(prefix="/api/transportes", tags=["transportes"])

@router.get("", response_model=List[TransporteResponse])
async def read_transportes(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_transporte.get_transportes(db, skip=skip, limit=limit)

@router.get("/{transporte_id}", response_model=TransporteResponse)
async def read_transporte(transporte_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_transporte = crud_transporte.get_transporte(db, transporte_id=transporte_id)
    if not db_transporte:
        raise HTTPException(status_code=404, detail="Transporte no encontrado")
    return db_transporte

@router.post("", response_model=TransporteResponse, status_code=status.HTTP_201_CREATED)
async def create_transporte(transporte_in: TransporteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_transporte.create_transporte(db=db, transporte=transporte_in)

@router.put("/{transporte_id}", response_model=TransporteResponse)
async def update_transporte(transporte_id: int, transporte_in: TransporteUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_transporte = crud_transporte.update_transporte(db=db, transporte_id=transporte_id, transporte=transporte_in)
    if not db_transporte:
        raise HTTPException(status_code=404, detail="Transporte no encontrado")
    return db_transporte

@router.delete("/{transporte_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transporte(transporte_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    success = crud_transporte.delete_transporte(db=db, transporte_id=transporte_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transporte no encontrado")
    return None
