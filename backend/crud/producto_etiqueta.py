from sqlalchemy.orm import Session
from models.producto import ProductoEtiqueta
from schemas.producto_etiqueta import ProductoEtiquetaCreate

def get_by_producto(db: Session, producto_id: int):
    return db.query(ProductoEtiqueta).filter(
        ProductoEtiqueta.producto_id == producto_id).first()

def upsert(db: Session, producto_id: int, data: ProductoEtiquetaCreate):
    obj = get_by_producto(db, producto_id)
    if obj is None:
        obj = ProductoEtiqueta(producto_id=producto_id, **data.model_dump())
        db.add(obj)
    else:
        for k, v in data.model_dump().items():
            setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj
