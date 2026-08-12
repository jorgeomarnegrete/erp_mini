from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from models.devolucion import Devolucion, DevolucionDetalle
from models.punto_venta import PuntoVenta
from models.producto import Producto, ProductoLoteStock
from schemas.devolucion import DevolucionCreate
from typing import Optional
from datetime import date

def create_devolucion(db: Session, devolucion_in: DevolucionCreate, user_id: int):
    # 1. Recuperar Punto De Venta para auto-numeración
    pv = db.query(PuntoVenta).filter(PuntoVenta.id == devolucion_in.punto_venta_id).first()
    if not pv:
        raise HTTPException(status_code=400, detail="Punto de Venta no válido")

    numero_asignado = pv.prox_devolucion

    # 2. Generar Cabecera
    db_devolucion = Devolucion(
        punto_venta_id=devolucion_in.punto_venta_id,
        numero_comprobante=numero_asignado,
        cliente_id=devolucion_in.cliente_id,
        usuario_id=user_id,
        vehiculo_id=devolucion_in.vehiculo_id,
        chofer_id=devolucion_in.chofer_id,
        motivo=devolucion_in.motivo,
        observaciones=devolucion_in.observaciones,
    )
    db.add(db_devolucion)
    db.flush()  # Genera el id de devolución

    # 3. Generar Renglones y devolver stock (siempre suma, es una devolución)
    for det in devolucion_in.detalles:
        db_det = DevolucionDetalle(
            devolucion_id=db_devolucion.id,
            producto_id=det.producto_id,
            cantidad=det.cantidad,
            nro_lote=det.nro_lote,
        )
        db.add(db_det)

        producto = db.query(Producto).filter(Producto.id == det.producto_id).first()
        if not producto:
            raise ValueError(f"Producto {det.producto_id} inexistente.")

        # ¿El producto maneja lotes? Si tiene al menos un lote registrado, el lote es OBLIGATORIO.
        tiene_lotes = db.query(ProductoLoteStock).filter(
            ProductoLoteStock.producto_id == det.producto_id
        ).count() > 0

        if tiene_lotes:
            if not det.nro_lote:
                raise ValueError(f"Debe seleccionar un lote para el producto '{producto.nombre}'.")
            lote_stock = db.query(ProductoLoteStock).filter(
                ProductoLoteStock.producto_id == det.producto_id,
                ProductoLoteStock.nro_lote == det.nro_lote
            ).first()
            if not lote_stock:
                raise ValueError(f"El lote '{det.nro_lote}' no existe para el producto '{producto.nombre}'.")
            lote_stock.cantidad_actual += det.cantidad

        producto.stock_actual += det.cantidad

    # 4. Actualizar número de correlativo
    pv.prox_devolucion += 1

    db.commit()
    db.refresh(db_devolucion)
    return db_devolucion

def get_devoluciones(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    cliente_id: Optional[int] = None,
):
    query = db.query(Devolucion)

    if fecha_desde:
        query = query.filter(func.date(Devolucion.fecha) >= fecha_desde)
    if fecha_hasta:
        query = query.filter(func.date(Devolucion.fecha) <= fecha_hasta)
    if cliente_id:
        query = query.filter(Devolucion.cliente_id == cliente_id)

    total = query.count()
    items = query.order_by(Devolucion.fecha.desc(), Devolucion.id.desc()).offset(skip).limit(limit).all()
    return items, total

def get_devolucion(db: Session, devolucion_id: int):
    return db.query(Devolucion).filter(Devolucion.id == devolucion_id).first()
