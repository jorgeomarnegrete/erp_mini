from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from models.stk_mov import StkMov
from models.producto import Producto, ProductoLoteStock
from schemas.stk_mov import StkMovCreate
from typing import Optional
from datetime import date

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

def get_movimientos_filtrados(
    db: Session,
    tipo: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    producto_id: Optional[int] = None,
    skip: Optional[int] = None,
    limit: Optional[int] = None,
):
    query = db.query(StkMov)

    if tipo:
        query = query.filter(StkMov.tipo == tipo)
    if fecha_desde:
        query = query.filter(func.date(StkMov.fecha_hora) >= fecha_desde)
    if fecha_hasta:
        query = query.filter(func.date(StkMov.fecha_hora) <= fecha_hasta)
    if producto_id:
        query = query.filter(StkMov.id_producto == producto_id)

    total = query.count()
    query = query.order_by(StkMov.fecha_hora.desc())
    if skip is not None and limit is not None:
        query = query.offset(skip).limit(limit)

    return query.all(), total

def serializar_reporte_item(mov: StkMov):
    return {
        "id_mov": mov.id_mov,
        "fecha_hora": mov.fecha_hora,
        "tipo": mov.tipo,
        "motivo": mov.motivo,
        "cantidad": mov.cantidad,
        "nro_lote": mov.nro_lote,
        "producto_codigo": mov.producto.codigo_interno if mov.producto else "",
        "producto_nombre": mov.producto.nombre if mov.producto else "",
        "usuario_nombre": (mov.usuario.nombre or mov.usuario.email) if mov.usuario else "",
    }
