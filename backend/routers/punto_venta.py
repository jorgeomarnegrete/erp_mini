from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.punto_venta import PuntoVentaCreate, PuntoVentaUpdate, PuntoVentaResponse
from crud import punto_venta as crud_pv
from routers.auth import get_current_admin_user

router = APIRouter(prefix="/api/puntos-venta", tags=["punto_venta"])

@router.get("", response_model=list[PuntoVentaResponse])
async def read_all_pv(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Lectura general exclusiva de Administradores"""
    return crud_pv.get_all(db)

@router.post("", response_model=PuntoVentaResponse, status_code=status.HTTP_201_CREATED)
async def create_pv(pv_in: PuntoVentaCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Alta de nuevo Punto de Venta validando correlatividad"""
    db_record = crud_pv.get_by_numero(db, numero=pv_in.numero)
    if db_record:
        raise HTTPException(status_code=400, detail=f"El Punto de Venta N° {pv_in.numero} ya existe.")
        
    return crud_pv.create(db=db, record_in=pv_in)

@router.put("/{record_id}", response_model=PuntoVentaResponse)
async def update_pv(record_id: int, pv_in: PuntoVentaUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Ajuste de datos estructurales y Modo Electrónico"""
    db_record = crud_pv.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Terminal Inexistente.")
    
    if pv_in.numero is not None and pv_in.numero != db_record.numero:
        check_num = crud_pv.get_by_numero(db, numero=pv_in.numero)
        if check_num:
            raise HTTPException(status_code=400, detail="El número de sucursal/punto de venta deseado ya está ocupado.")
            
    return crud_pv.update(db=db, db_record=db_record, record_update=pv_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pv(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Eliminación Física. Se recomienda inhabilitar logicamente en prod."""
    db_record = crud_pv.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="No encontrado.")
        
    crud_pv.delete(db=db, db_record=db_record)
    return None
