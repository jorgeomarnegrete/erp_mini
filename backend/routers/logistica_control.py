from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from pydantic import BaseModel

from database import get_db
from models.user import User
from models.remito import Remito, RemitoDetalle
from models.producto import Producto
from models.transporte import Transporte
from routers.auth import get_current_user

router = APIRouter(prefix="/api/logistica/control", tags=["logistica"])

class ConfirmarDespachoRequest(BaseModel):
    transporte_id: int
    items_escaneados: List[Dict[str, float]] # [{producto_id: 1, cantidad: 10}, ...]

@router.get("/transportes-listos")
async def read_transportes_listos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Transportes que tienen remitos pendientes de stock
    transportes_ids = db.query(Remito.transporte_id).filter(
        Remito.transporte_id != None,
        Remito.stock_procesado == False
    ).distinct().all()
    
    ids = [r[0] for r in transportes_ids]
    return db.query(Transporte).filter(Transporte.id.in_(ids)).all()

@router.get("/{transporte_id}/carga")
async def read_carga_transporte(transporte_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Consolidar lo que SE ESPERA para ese transporte
    remitos = db.query(Remito).filter(
        Remito.transporte_id == transporte_id,
        Remito.stock_procesado == False
    ).all()
    
    remito_ids = [r.id for r in remitos]
    if not remito_ids:
        return []
        
    carga = db.query(
        Producto.id,
        Producto.nombre,
        func.sum(RemitoDetalle.cantidad).label('cantidad_esperada')
    ).join(RemitoDetalle, Producto.id == RemitoDetalle.producto_id)\
     .filter(RemitoDetalle.remito_id.in_(remito_ids))\
     .group_by(Producto.id, Producto.nombre).all()
    
    return [{"producto_id": c.id, "nombre": c.nombre, "cantidad_esperada": c.cantidad_esperada} for c in carga]

@router.post("/confirmar")
async def confirmar_despacho(data: ConfirmarDespachoRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # 1. Descontar Stock Real
        for item in data.items_escaneados:
            producto = db.query(Producto).filter(Producto.id == item['producto_id']).first()
            if producto:
                producto.stock_actual -= item['cantidad']
        
        # 2. Marcar Remitos como Procesados
        remitos = db.query(Remito).filter(
            Remito.transporte_id == data.transporte_id,
            Remito.stock_procesado == False
        ).all()
        
        for remito in remitos:
            remito.stock_procesado = True
            
        db.commit()
        return {"message": "Despacho confirmado y stock actualizado con éxito"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
