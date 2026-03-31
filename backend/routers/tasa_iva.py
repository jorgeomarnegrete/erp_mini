from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.tasa_iva import TasaIvaCreate, TasaIvaUpdate, TasaIvaResponse
from crud import tasa_iva as crud_iva
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/tasas-iva", tags=["tasa_iva"])

# Lectura de IVA permitida para todos para poder mostrar productos.
@router.get("", response_model=list[TasaIvaResponse])
async def read_all_iva(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lectura de Impuestos"""
    return crud_iva.get_all(db)

@router.post("", response_model=TasaIvaResponse, status_code=status.HTTP_201_CREATED)
async def create_iva(iva_in: TasaIvaCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Añadir nuevo registro AFIP IVA"""
    if crud_iva.get_by_codigo(db, codigo_arca=iva_in.codigo_arca):
         raise HTTPException(status_code=400, detail="Ya existe una tasa con ese Código de ARCA.")
    if crud_iva.get_by_nombre(db, nombre=iva_in.nombre):
         raise HTTPException(status_code=400, detail="Esta descripción tributaria ya está registrada.")
        
    return crud_iva.create(db=db, record_in=iva_in)

@router.put("/{record_id}", response_model=TasaIvaResponse)
async def update_iva(record_id: int, iva_in: TasaIvaUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Corrección de Tasas"""
    db_record = crud_iva.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Impuesto Inexistente.")
    
    if iva_in.codigo_arca is not None and iva_in.codigo_arca != db_record.codigo_arca:
         if crud_iva.get_by_codigo(db, codigo_arca=iva_in.codigo_arca):
             raise HTTPException(status_code=400, detail="El código ARCA ya existe.")
            
    return crud_iva.update(db=db, db_record=db_record, record_update=iva_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_iva(record_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_record = crud_iva.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Impuesto no encontrado.")
        
    crud_iva.delete(db=db, db_record=db_record)
    return None
