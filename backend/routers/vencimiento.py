from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.vencimiento import Vencimiento
from schemas.vencimiento import VencimientoCreate, VencimientoUpdate, VencimientoResponse
from crud import vencimiento as crud_venc
from routers.auth import get_current_user

router = APIRouter(prefix="/api/vencimientos", tags=["Vencimientos"])

@router.get("", response_model=List[VencimientoResponse])
def get_vencimientos(entidad_tipo: str, entidad_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_venc.get_by_entidad(db, entidad_tipo=entidad_tipo, entidad_id=entidad_id)

@router.get("/alertas/proximos")
def get_alerta_proximos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Conteo de vencimientos no finalizados dentro de su ventana de aviso"""
    return {"cantidad": crud_venc.count_proximos(db)}

@router.post("", response_model=VencimientoResponse, status_code=201)
def create_vencimiento(data: VencimientoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_venc.create(db, data)

@router.put("/{vencimiento_id}", response_model=VencimientoResponse)
def update_vencimiento(vencimiento_id: int, data: VencimientoUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = db.query(Vencimiento).filter(Vencimiento.id == vencimiento_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    return crud_venc.update(db, db_record, data)

@router.delete("/{vencimiento_id}", status_code=204)
def delete_vencimiento(vencimiento_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = db.query(Vencimiento).filter(Vencimiento.id == vencimiento_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    crud_venc.delete(db, db_record)
    return None
