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
            
        # Consolidar por producto y LOTE
        consolidated = db.query(
            RemitoDetalle.producto_id,
            RemitoDetalle.nro_lote,
            func.sum(RemitoDetalle.cantidad).label('total_cant')
        ).filter(RemitoDetalle.remito_id.in_(remito_ids)).group_by(RemitoDetalle.producto_id, RemitoDetalle.nro_lote).all()
        
        # Crear registros temporales
        for row in consolidated:
            new_item = CargaPreparacion(
                transporte_id=transporte_id,
                producto_id=row.producto_id,
                nro_lote=row.nro_lote,
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
    # 1. Buscar remitos asociados al transporte que aún no descontaron stock
    remitos = db.query(Remito).filter(
        Remito.transporte_id == transporte_id,
        Remito.descuenta_stock == False
    ).all()

    for remito in remitos:
        # Marcar remito como "Preparado" para que lo vea Control de Despacho
        remito.descuenta_stock = True
        remito.stock_procesado = False

    # 2. Limpiar tabla temporal de preparación
    db.query(CargaPreparacion).filter(CargaPreparacion.transporte_id == transporte_id).delete()
    
    db.commit()
    return True
