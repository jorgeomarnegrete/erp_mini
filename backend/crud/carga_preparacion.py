from sqlalchemy.orm import Session
from sqlalchemy import func
from models.carga_preparacion import CargaPreparacion
from models.remito import Remito, RemitoDetalle
from models.producto import Producto

def get_preparacion_items(db: Session, transporte_id: int, user_id: int):
    # Verificar si ya hay una preparación iniciada para este transporte
    items = db.query(CargaPreparacion).filter(CargaPreparacion.transporte_id == transporte_id).all()
    
    if not items:
        # Iniciar preparación: Consolidar productos de remitos asignados
        # Buscamos todos los remitos asociados al transporte
        remitos = db.query(Remito).filter(Remito.transporte_id == transporte_id).all()
        remito_ids = [r.id for r in remitos]
        
        if not remito_ids:
            return []
            
        # Consolidar por producto
        consolidated = db.query(
            RemitoDetalle.producto_id,
            func.sum(RemitoDetalle.cantidad).label('total_cant')
        ).filter(RemitoDetalle.remito_id.in_(remito_ids)).group_by(RemitoDetalle.producto_id).all()
        
        # Crear registros temporales
        for row in consolidated:
            new_item = CargaPreparacion(
                transporte_id=transporte_id,
                producto_id=row.producto_id,
                user_id=user_id,
                cantidad=row.total_cant,
                preparado=False
            )
            db.add(new_item)
        
        db.commit()
        items = db.query(CargaPreparacion).filter(CargaPreparacion.transporte_id == transporte_id).all()
        
    return items

def toggle_preparado(db: Session, item_id: int):
    item = db.query(CargaPreparacion).filter(CargaPreparacion.id == item_id).first()
    if item:
        item.preparado = not item.preparado
        db.commit()
        db.refresh(item)
    return item

def delete_preparacion(db: Session, transporte_id: int):
    db.query(CargaPreparacion).filter(CargaPreparacion.transporte_id == transporte_id).delete()
    db.commit()
    return True
