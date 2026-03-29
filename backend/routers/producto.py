from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
from crud import producto as crud_prod
from routers.auth import get_current_user

router = APIRouter(prefix="/api/productos", tags=["producto"])

@router.get("", response_model=list[ProductoResponse])
async def read_all_productos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Apertura total de inventarios (Incluyendo Matrices Anidadas)"""
    return crud_prod.get_all(db)

@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_producto(prod_in: ProductoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creación Master de Producto y de Sub-precios a Medida"""
    if crud_prod.get_by_codigo_interno(db, prod_in.codigo_interno):
        raise HTTPException(status_code=400, detail="Ese Código (SKU) ya está asignado a otro producto.")
    if prod_in.codigo_barras and crud_prod.get_by_codigo_barras(db, prod_in.codigo_barras):
        raise HTTPException(status_code=400, detail="Este Código de Barras ya fue escaneado en otro artículo existente.")
        
    return crud_prod.create(db=db, record_in=prod_in)

@router.put("/{record_id}", response_model=ProductoResponse)
async def update_producto(record_id: int, prod_in: ProductoUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Actualización integral de Producto Destructiva para su Matriz"""
    db_record = crud_prod.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="SKU No Encontrado.")
    
    # Validaciones Anti-Duplicación Cautelosas
    if prod_in.codigo_interno is not None and prod_in.codigo_interno != db_record.codigo_interno:
        if crud_prod.get_by_codigo_interno(db, prod_in.codigo_interno):
            raise HTTPException(status_code=400, detail="El Código Interno deseado pertenece a otra familia.")
    
    if prod_in.codigo_barras is not None and prod_in.codigo_barras != db_record.codigo_barras and prod_in.codigo_barras != "":
        if crud_prod.get_by_codigo_barras(db, prod_in.codigo_barras):
            raise HTTPException(status_code=400, detail="Violación Técnica: El código de barras ya existe.")
            
    return crud_prod.update(db=db, db_record=db_record, record_update=prod_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = crud_prod.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Objeto Inexistente.")
        
    crud_prod.delete(db=db, db_record=db_record)
    return None
