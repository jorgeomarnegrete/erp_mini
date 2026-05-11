from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas.remito_compra import RemitoCompraCreate, RemitoCompraResponse
from crud import remito_compra as remito_comp_crud
from routers.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/api/remitos-compra", tags=["Remitos Compra"])

@router.post("/", response_model=RemitoCompraResponse)
def create_remito(
    remito_in: RemitoCompraCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return remito_comp_crud.create_remito_compra(db, remito_in, current_user.id)

@router.get("/", response_model=List[RemitoCompraResponse])
def read_remitos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return remito_comp_crud.get_remitos_compra(db, skip=skip, limit=limit)

@router.get("/control/pendientes", response_model=List[RemitoCompraResponse])
def read_remitos_pendientes_control(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return remito_comp_crud.get_remitos_pendientes_control(db)

@router.post("/control/escanear-item")
def scan_item(
    remito_id: int,
    producto_id: int,
    nro_lote: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return remito_comp_crud.procesar_escaneo_item(db, remito_id, producto_id, nro_lote, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{remito_id}", response_model=RemitoCompraResponse)
def read_remito(
    remito_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_remito = remito_comp_crud.get_remito_compra(db, remito_id=remito_id)
    if db_remito is None:
        raise HTTPException(status_code=404, detail="Remito de compra no encontrado")
    return db_remito
