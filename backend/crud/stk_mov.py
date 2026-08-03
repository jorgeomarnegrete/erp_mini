from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.stk_mov import StkMov
from models.producto import Producto, ProductoLoteStock
from schemas.stk_mov import StkMovCreate

def create_movimientos(db: Session, mov_data: StkMovCreate, user_id: int):
    created_movs = []

    try:
        for item in mov_data.items:
            producto = db.query(Producto).filter(Producto.id == item.id_producto).first()
            if not producto:
                raise HTTPException(status_code=404, detail=f"Producto con id {item.id_producto} no encontrado")

            tiene_lotes = db.query(ProductoLoteStock).filter(
                ProductoLoteStock.producto_id == item.id_producto
            ).count() > 0

            # Este ajuste manual nunca crea lotes nuevos: si el producto maneja
            # lotes, hay que elegir uno existente para saber a cuál sumar/restar.
            lote_stock = None
            if tiene_lotes:
                if not item.nro_lote:
                    raise HTTPException(status_code=400, detail=f"Debe seleccionar un lote para '{producto.nombre}'.")
                lote_stock = db.query(ProductoLoteStock).filter(
                    ProductoLoteStock.producto_id == item.id_producto,
                    ProductoLoteStock.nro_lote == item.nro_lote
                ).first()
                if not lote_stock:
                    raise HTTPException(status_code=400, detail=f"El lote '{item.nro_lote}' no existe para '{producto.nombre}'.")

            if mov_data.tipo == 1:
                producto.stock_actual += item.cantidad
                if lote_stock:
                    lote_stock.cantidad_actual += item.cantidad
            elif mov_data.tipo == 2:
                producto.stock_actual -= item.cantidad
                if lote_stock:
                    lote_stock.cantidad_actual -= item.cantidad

            nuevo_mov = StkMov(
                id_usuario=user_id,
                id_producto=item.id_producto,
                motivo=mov_data.motivo,
                cantidad=item.cantidad,
                tipo=mov_data.tipo,
                nro_lote=item.nro_lote
            )
            db.add(nuevo_mov)
            created_movs.append(nuevo_mov)
            
        db.commit()
        for mov in created_movs:
            db.refresh(mov)
            
        return created_movs
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def get_all(db: Session):
    return db.query(StkMov).order_by(StkMov.fecha_hora.desc()).all()
