from sqlalchemy.orm import Session
from models.producto import Producto, ProductoPrecio
from schemas.producto import ProductoCreate, ProductoUpdate

def get_all(db: Session, skip: int = 0, limit: int | None = None):
    query = db.query(Producto).order_by(Producto.nombre.asc()).offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()

def get_by_id(db: Session, record_id: int):
    return db.query(Producto).filter(Producto.id == record_id).first()

def _query_bajo_stock_minimo(db: Session, categoria_id: int | None = None):
    query = db.query(Producto).filter(
        Producto.activo == True,
        Producto.stock_minimo > 0,
        Producto.stock_actual <= Producto.stock_minimo
    )
    if categoria_id is not None:
        query = query.filter(Producto.categoria_id == categoria_id)
    return query

def count_bajo_stock_minimo(db: Session):
    """Cuenta productos activos con control de stock mínimo habilitado (stock_minimo > 0) que están por debajo"""
    return _query_bajo_stock_minimo(db).count()

def get_bajo_stock_minimo(db: Session, categoria_id: int | None = None):
    """Lista productos activos por debajo del stock mínimo, opcionalmente filtrados por familia"""
    return _query_bajo_stock_minimo(db, categoria_id=categoria_id).order_by(Producto.nombre.asc()).all()

def get_by_codigo_interno(db: Session, codigo: str):
    return db.query(Producto).filter(Producto.codigo_interno == codigo).first()

def get_by_codigo_barras(db: Session, codigo: str):
    if not codigo: return None
    return db.query(Producto).filter(Producto.codigo_barras == codigo).first()

def create(db: Session, record_in: ProductoCreate):
    # Separamos la ficha técnica pura de la tabla Matrix transaccional
    data_dict = record_in.model_dump(exclude={"precios_costum"})
    db_record = Producto(**data_dict)
    db.add(db_record)
    db.flush() # Liberar el ID para vincular matrix abajo sin cerrar TX

    # Inyección de las casillas costum que el usuario pisó (si existiesen)
    for p_costum in record_in.precios_costum:
        nuevo_precio = ProductoPrecio(
            producto_id=db_record.id,
            lista_precio_id=p_costum.lista_precio_id,
            precio_personalizado=p_costum.precio_personalizado
        )
        db.add(nuevo_precio)

    db.commit()
    db.refresh(db_record)
    return db_record

def update(db: Session, db_record: Producto, record_update: ProductoUpdate):
    update_data = record_update.model_dump(exclude_unset=True, exclude={"precios_costum"})
    
    # Update ficha técnica pura
    for key, value in update_data.items():
        setattr(db_record, key, value)
        
    # Reconstrucción quirúrgica de la matriz Híbrida: The Destructive Strategy (Rápida y Cero Riesgo)
    if record_update.precios_costum is not None:
         # 1. Barre todos los viejos customizados existentes
         db.query(ProductoPrecio).filter(ProductoPrecio.producto_id == db_record.id).delete()
         
         # 2. Inyecta la matriz recien llegada entera
         for p_costum in record_update.precios_costum:
             nuevo_precio = ProductoPrecio(
                 producto_id=db_record.id,
                 lista_precio_id=p_costum.lista_precio_id,
                 precio_personalizado=p_costum.precio_personalizado
             )
             db.add(nuevo_precio)
             
    db.commit()
    db.refresh(db_record)
    return db_record

def delete(db: Session, db_record: Producto):
    db.delete(db_record)
    db.commit()
    return db_record
