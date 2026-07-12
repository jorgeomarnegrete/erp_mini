from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.orden_produccion import (
    OrdenProduccionCreate,
    OrdenProduccionResponse,
    OrdenProduccionCierre,
)
from crud import orden_produccion as crud_op
from routers.auth import get_current_user

router = APIRouter(prefix="/api/ordenes-produccion", tags=["ordenes_produccion"])


@router.get("", response_model=List[OrdenProduccionResponse])
async def read_ordenes(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Historial de órdenes de producción."""
    return crud_op.get_ordenes(db, skip=skip, limit=limit)


@router.get("/{orden_id}", response_model=OrdenProduccionResponse)
async def read_orden(orden_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_orden = crud_op.get_orden(db, orden_id=orden_id)
    if not db_orden:
        raise HTTPException(status_code=404, detail="Orden de producción no encontrada")
    return db_orden


@router.post("", response_model=OrdenProduccionResponse, status_code=status.HTTP_201_CREATED)
async def create_orden(orden_in: OrdenProduccionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea una OP en estado 'Abierta' (compromete stock del insumo por cálculo)."""
    try:
        return crud_op.create_orden(db=db, orden_in=orden_in, user_id=current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{orden_id}/cerrar", response_model=OrdenProduccionResponse)
async def cerrar_orden(orden_id: int, cierre_in: OrdenProduccionCierre, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cierra la OP: descuenta insumos y da de alta subproductos (con sus lotes)."""
    db_orden = crud_op.get_orden(db, orden_id=orden_id)
    if not db_orden:
        raise HTTPException(status_code=404, detail="Orden de producción no encontrada")
    return crud_op.cerrar_orden(db=db, db_orden=db_orden, cierre_in=cierre_in)


@router.post("/{orden_id}/cancelar", response_model=OrdenProduccionResponse)
async def cancelar_orden(orden_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cancela una OP abierta (libera el compromiso; no mueve stock)."""
    db_orden = crud_op.get_orden(db, orden_id=orden_id)
    if not db_orden:
        raise HTTPException(status_code=404, detail="Orden de producción no encontrada")
    return crud_op.cancelar_orden(db=db, db_orden=db_orden)
