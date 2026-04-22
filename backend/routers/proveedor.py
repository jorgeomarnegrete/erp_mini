from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User
from routers.auth import get_current_user
import crud.proveedor as crud_prov
import schemas.proveedor as schemas_prov

router = APIRouter(prefix="/api/proveedores", tags=["proveedores"])

@router.get("/", response_model=List[schemas_prov.ProveedorResponse])
def read_proveedores(skip: int = 0, limit: int = 500, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud_prov.get_proveedores(db, skip=skip, limit=limit)

@router.get("/{proveedor_id}", response_model=schemas_prov.ProveedorResponse)
def read_proveedor(proveedor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud_prov.get_proveedor(db, proveedor_id)

@router.post("/", response_model=schemas_prov.ProveedorResponse, status_code=status.HTTP_201_CREATED)
def create_proveedor(proveedor: schemas_prov.ProveedorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud_prov.create_proveedor(db=db, proveedor=proveedor)

@router.put("/{proveedor_id}", response_model=schemas_prov.ProveedorResponse)
def update_proveedor(proveedor_id: int, proveedor: schemas_prov.ProveedorUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud_prov.update_proveedor(db=db, proveedor_id=proveedor_id, proveedor=proveedor)

@router.delete("/{proveedor_id}", response_model=schemas_prov.ProveedorResponse)
def delete_proveedor(proveedor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud_prov.delete_proveedor(db=db, proveedor_id=proveedor_id)
