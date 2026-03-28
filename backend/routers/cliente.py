from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from crud import cliente as crud_cliente
from routers.auth import get_current_user

router = APIRouter(prefix="/api/clientes", tags=["cliente"])

@router.get("", response_model=list[ClienteResponse])
async def read_all_clientes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lectura general del padrón de Clientes"""
    return crud_cliente.get_all(db)

@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
async def create_cliente(cliente_in: ClienteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creación de cliente Validando CUIT único"""
    db_record = crud_cliente.get_by_documento(db, documento=cliente_in.documento)
    if db_record:
        raise HTTPException(status_code=400, detail="El Número de Documento / CUIT ya se encuentra registrado en otro cliente.")
        
    return crud_cliente.create(db=db, record_in=cliente_in)

@router.put("/{record_id}", response_model=ClienteResponse)
async def update_cliente(record_id: int, cliente_in: ClienteUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Actualización de Clientes"""
    db_record = crud_cliente.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Cliente Inexistente en la base de datos.")
    
    if cliente_in.documento is not None and cliente_in.documento != db_record.documento:
        check_doc = crud_cliente.get_by_documento(db, documento=cliente_in.documento)
        if check_doc:
            raise HTTPException(status_code=400, detail="Este Número de Documento ya está reclamado por otra entidad.")
            
    return crud_cliente.update(db=db, db_record=db_record, record_update=cliente_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cliente(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Baja Opcional de cliente. En producción sugerimos activo=False"""
    db_record = crud_cliente.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Cliente NO Encontrado.")
        
    crud_cliente.delete(db=db, db_record=db_record)
    return None
