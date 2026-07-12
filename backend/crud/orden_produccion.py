from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
import datetime

from models.orden_produccion import OrdenProduccion, OpInsumo, OpProducto
from models.producto import Producto, ProductoLoteStock
from schemas.orden_produccion import OrdenProduccionCreate, OrdenProduccionCierre


def _proximo_numero(db: Session) -> int:
    ultimo = db.query(func.max(OrdenProduccion.numero)).scalar()
    return (ultimo or 0) + 1


def create_orden(db: Session, orden_in: OrdenProduccionCreate, user_id: int):
    if not orden_in.insumos:
        raise HTTPException(status_code=400, detail="La orden debe tener al menos un insumo.")
    if not orden_in.productos:
        raise HTTPException(status_code=400, detail="La orden debe tener al menos un subproducto.")

    db_orden = OrdenProduccion(
        numero=_proximo_numero(db),
        fecha=orden_in.fecha or datetime.datetime.utcnow(),
        usuario_id=user_id,
        estado="Abierta",
        observaciones=orden_in.observaciones,
    )
    db.add(db_orden)
    db.flush()  # asigna id sin cerrar la transacción

    for ins in orden_in.insumos:
        db.add(OpInsumo(
            op_id=db_orden.id,
            producto_id=ins.producto_id,
            cantidad_planificada=ins.cantidad_planificada,
            cantidad_real=0.0,
            nro_lote=ins.nro_lote,
        ))

    for prod in orden_in.productos:
        db.add(OpProducto(
            op_id=db_orden.id,
            producto_id=prod.producto_id,
            cantidad_planificada=prod.cantidad_planificada,
            cantidad_real=0.0,
            nro_lote_generado=prod.nro_lote_generado,
            fecha_vencimiento=prod.fecha_vencimiento,
        ))

    db.commit()
    db.refresh(db_orden)
    return db_orden


def get_ordenes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(OrdenProduccion).order_by(OrdenProduccion.id.desc()).offset(skip).limit(limit).all()


def get_orden(db: Session, orden_id: int):
    return db.query(OrdenProduccion).filter(OrdenProduccion.id == orden_id).first()


def get_stock_comprometido_op(db: Session, producto_id: int) -> float:
    """
    Materia prima comprometida por Órdenes de Producción abiertas.
    Se usa la cantidad planificada de los insumos de OPs en estado 'Abierta'.
    """
    comprometido = db.query(func.sum(OpInsumo.cantidad_planificada)) \
                     .join(OrdenProduccion) \
                     .filter(OpInsumo.producto_id == producto_id) \
                     .filter(OrdenProduccion.estado == "Abierta") \
                     .scalar()
    return float(comprometido or 0.0)


def _descontar_lote(db: Session, producto_id: int, nro_lote: str, cantidad: float):
    """Descuenta de un lote específico, validando saldo suficiente."""
    lote = db.query(ProductoLoteStock).filter(
        ProductoLoteStock.producto_id == producto_id,
        ProductoLoteStock.nro_lote == nro_lote,
    ).first()
    if not lote:
        raise HTTPException(status_code=400, detail=f"No existe el lote '{nro_lote}' para el producto {producto_id}.")
    if lote.cantidad_actual < cantidad:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente en el lote '{nro_lote}' (disponible {lote.cantidad_actual}, requerido {cantidad}).",
        )
    lote.cantidad_actual -= cantidad


def cerrar_orden(db: Session, db_orden: OrdenProduccion, cierre_in: OrdenProduccionCierre):
    """
    Cierra la OP en una sola transacción: descuenta insumos (producto primario)
    y da de alta subproductos. Afecta stock_actual y ProductoLoteStock directo,
    sin registrar en stk_mov.
    """
    if db_orden.estado != "Abierta":
        raise HTTPException(status_code=400, detail=f"La orden está '{db_orden.estado}', no se puede cerrar.")

    insumos_por_id = {i.id: i for i in db_orden.insumos}
    productos_por_id = {p.id: p for p in db_orden.productos}

    try:
        # --- 1. Volcar cantidades reales al detalle ---
        for c in cierre_in.insumos:
            det = insumos_por_id.get(c.id)
            if not det:
                raise HTTPException(status_code=400, detail=f"El insumo {c.id} no pertenece a esta orden.")
            if c.cantidad_real <= 0:
                raise HTTPException(status_code=400, detail="La cantidad real de un insumo debe ser mayor a 0.")
            det.cantidad_real = c.cantidad_real
            if c.nro_lote is not None:
                det.nro_lote = c.nro_lote

        for c in cierre_in.productos:
            det = productos_por_id.get(c.id)
            if not det:
                raise HTTPException(status_code=400, detail=f"El subproducto {c.id} no pertenece a esta orden.")
            if c.cantidad_real <= 0:
                raise HTTPException(status_code=400, detail="La cantidad real de un subproducto debe ser mayor a 0.")
            det.cantidad_real = c.cantidad_real
            if c.nro_lote_generado is not None:
                det.nro_lote_generado = c.nro_lote_generado
            if c.fecha_vencimiento is not None:
                det.fecha_vencimiento = c.fecha_vencimiento

        # --- 2. Descontar insumos (salida) ---
        for det in db_orden.insumos:
            producto = db.query(Producto).filter(Producto.id == det.producto_id).first()
            if not producto:
                raise HTTPException(status_code=404, detail=f"Producto insumo {det.producto_id} inexistente.")
            if producto.stock_actual < det.cantidad_real:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente de '{producto.nombre}' (disponible {producto.stock_actual}, requerido {det.cantidad_real}).",
                )
            if det.nro_lote:
                _descontar_lote(db, det.producto_id, det.nro_lote, det.cantidad_real)
            producto.stock_actual -= det.cantidad_real

        # --- 3. Dar de alta subproductos (entrada) ---
        for det in db_orden.productos:
            producto = db.query(Producto).filter(Producto.id == det.producto_id).first()
            if not producto:
                raise HTTPException(status_code=404, detail=f"Subproducto {det.producto_id} inexistente.")
            producto.stock_actual += det.cantidad_real
            if det.nro_lote_generado:
                lote = db.query(ProductoLoteStock).filter(
                    ProductoLoteStock.producto_id == det.producto_id,
                    ProductoLoteStock.nro_lote == det.nro_lote_generado,
                ).first()
                if lote:
                    lote.cantidad_actual += det.cantidad_real
                    if det.fecha_vencimiento is not None:
                        lote.fecha_vencimiento = det.fecha_vencimiento
                else:
                    db.add(ProductoLoteStock(
                        producto_id=det.producto_id,
                        nro_lote=det.nro_lote_generado,
                        fecha_vencimiento=det.fecha_vencimiento,
                        cantidad_actual=det.cantidad_real,
                    ))

        # --- 4. Cerrar ---
        db_orden.estado = "Cerrada"
        db_orden.fecha_cierre = datetime.datetime.utcnow()

        db.commit()
        db.refresh(db_orden)
        return db_orden

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def cancelar_orden(db: Session, db_orden: OrdenProduccion):
    if db_orden.estado != "Abierta":
        raise HTTPException(status_code=400, detail=f"La orden está '{db_orden.estado}', no se puede cancelar.")
    db_orden.estado = "Cancelada"
    db.commit()
    db.refresh(db_orden)
    return db_orden
