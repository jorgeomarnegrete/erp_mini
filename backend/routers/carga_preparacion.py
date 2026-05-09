from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.carga_preparacion import CargaPreparacionResponse
from crud import carga_preparacion as crud_picking
from routers.auth import get_current_user
from models.transporte import Transporte

router = APIRouter(prefix="/api/logistica/preparacion", tags=["logistica"])

@router.get("/transportes-pendientes")
async def read_transportes_pendientes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Transportes que tienen remitos asignados pero están en carga_preparacion o tienen remitos sin procesar
    # Para simplificar, traemos todos los transportes que tienen remitos con descuenta_stock=False
    from models.remito import Remito
    transportes_ids = db.query(Remito.transporte_id).filter(
        Remito.transporte_id != None,
        Remito.descuenta_stock == False
    ).distinct().all()
    
    ids = [r[0] for r in transportes_ids]
    return db.query(Transporte).filter(Transporte.id.in_(ids)).all()

@router.get("/{transporte_id}", response_model=List[CargaPreparacionResponse])
async def read_preparacion(transporte_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_picking.get_preparacion_items(db, transporte_id=transporte_id, user_id=current_user.id)

@router.patch("/{item_id}", response_model=CargaPreparacionResponse)
async def update_item_preparado(item_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_picking.toggle_preparado(db, item_id=item_id)

@router.post("/{transporte_id}/finalizar")
async def finalize_preparacion(transporte_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    crud_picking.delete_preparacion(db, transporte_id=transporte_id)
    return {"message": "Preparación finalizada y tabla temporal limpia"}
