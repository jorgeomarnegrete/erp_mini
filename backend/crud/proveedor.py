from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.proveedor import Proveedor
from schemas.proveedor import ProveedorCreate, ProveedorUpdate

def get_proveedor(db: Session, proveedor_id: int):
    return db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()

def get_proveedor_by_documento(db: Session, documento: str):
    return db.query(Proveedor).filter(Proveedor.documento == documento).first()

def get_proveedores(db: Session, skip: int = 0, limit: int = 500):
    return db.query(Proveedor).order_by(Proveedor.razon_social.asc()).offset(skip).limit(limit).all()

def create_proveedor(db: Session, proveedor: ProveedorCreate):
    # Validar unicidad
    if get_proveedor_by_documento(db, proveedor.documento):
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con este documento")
        
    db_prov = Proveedor(**proveedor.model_dump())
    db.add(db_prov)
    db.commit()
    db.refresh(db_prov)
    return db_prov

def update_proveedor(db: Session, proveedor_id: int, proveedor: ProveedorUpdate):
    db_prov = get_proveedor(db, proveedor_id)
    if not db_prov:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        
    update_data = proveedor.model_dump(exclude_unset=True)
    
    # Validar unicidad si el documento cambió
    if "documento" in update_data and update_data["documento"] != db_prov.documento:
        if get_proveedor_by_documento(db, update_data["documento"]):
            raise HTTPException(status_code=400, detail="El nuevo documento ya está registrado en otro proveedor")
            
    for key, value in update_data.items():
        setattr(db_prov, key, value)
        
    db.commit()
    db.refresh(db_prov)
    return db_prov

def delete_proveedor(db: Session, proveedor_id: int):
    db_prov = get_proveedor(db, proveedor_id)
    if not db_prov:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Podríamos cambiar a inactivo, pero respetaremos delete físico o decisión de negocio
    db.delete(db_prov)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar porque existen compras, remitos o registros asociados. Sugerimos desactivarlo."
        )
    return db_prov
