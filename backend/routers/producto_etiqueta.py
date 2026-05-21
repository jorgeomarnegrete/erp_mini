from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from crud import producto_etiqueta as crud_pe
from schemas.producto_etiqueta import ProductoEtiquetaRead, ProductoEtiquetaCreate

router = APIRouter(
    prefix="/api/productos/{producto_id}/etiqueta",
    tags=["Productos Etiquetas"]
)

@router.get("", response_model=ProductoEtiquetaRead)
def get_etiqueta(producto_id: int, db: Session = Depends(get_db)):
    etiqueta = crud_pe.get_by_producto(db, producto_id)
    if not etiqueta:
        raise HTTPException(status_code=404, detail="Etiqueta no encontrada")
    return etiqueta

@router.put("", response_model=ProductoEtiquetaRead)
def upsert_etiqueta(producto_id: int, etiqueta_in: ProductoEtiquetaCreate, db: Session = Depends(get_db)):
    # Podríamos verificar aquí si el producto existe, pero por ForeignKey fallará igual si no existe.
    return crud_pe.upsert(db, producto_id, etiqueta_in)
