from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.stk_mov import StkMovCreate, StkMovOut
from routers.auth import get_current_user
from crud import stk_mov as crud_stk_mov

router = APIRouter(prefix="/api/stk-mov", tags=["Movimientos de Stock"])

@router.post("", response_model=List[StkMovOut])
def create_stk_mov(mov_data: StkMovCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creación de ajustes/movimientos de stock y actualización de inventario."""
    if mov_data.tipo not in [1, 2]:
        raise HTTPException(status_code=400, detail="El tipo debe ser 1 (Entrada) o 2 (Salida)")
    return crud_stk_mov.create_movimientos(db=db, mov_data=mov_data, user_id=current_user.id)

@router.get("", response_model=List[StkMovOut])
def get_stk_movs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtener el historial de movimientos de stock."""
    return crud_stk_mov.get_all(db)
