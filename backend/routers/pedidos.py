from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.pedido import PedidoCreate, PedidoResponse
from crud import pedido as crud_pedido
from routers.auth import get_current_user

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])

@router.get("", response_model=List[PedidoResponse])
async def read_pedidos(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene el historial de pedidos"""
    return crud_pedido.get_pedidos(db, skip=skip, limit=limit)

@router.get("/{pedido_id}", response_model=PedidoResponse)
async def read_pedido(pedido_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene un pedido específico con sus detalles"""
    db_pedido = crud_pedido.get_pedido(db, pedido_id=pedido_id)
    if not db_pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return db_pedido

@router.post("", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
async def create_pedido(pedido_in: PedidoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea un nuevo pedido con sus renglones"""
    try:
        return crud_pedido.create_pedido(db=db, pedido_in=pedido_in, user_id=current_user.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
