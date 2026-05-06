from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from models.pedido import Pedido, PedidoDetalle
from models.punto_venta import PuntoVenta
from schemas.pedido import PedidoCreate

def create_pedido(db: Session, pedido_in: PedidoCreate, user_id: int):
    # 1. Recuperar Punto De Venta para auto-numeración
    pv = db.query(PuntoVenta).filter(PuntoVenta.id == pedido_in.punto_venta_id).first()
    if not pv:
        raise HTTPException(status_code=400, detail="Punto de Venta no válido")
        
    numero_asignado = pv.prox_pedido
    
    # 2. Generar Cabecera
    db_pedido = Pedido(
        punto_venta_id=pedido_in.punto_venta_id,
        numero_comprobante=numero_asignado,
        cliente_id=pedido_in.cliente_id,
        usuario_id=user_id,
        vendedor_id=pedido_in.vendedor_id,
        estado=pedido_in.estado,
        observaciones=pedido_in.observaciones,
        fecha_entrega=pedido_in.fecha_entrega,
        subtotal=pedido_in.subtotal,
        descuento_porcentaje=pedido_in.descuento_porcentaje,
        descuento_monto=pedido_in.descuento_monto,
        iva=pedido_in.iva,
        total=pedido_in.total
    )
    db.add(db_pedido)
    db.flush() # Genera el id de pedido sin hacer commit completo
    
    # 3. Generar Renglones vinculados a la cabecera
    for det in pedido_in.detalles:
        db_det = PedidoDetalle(
            pedido_id=db_pedido.id,
            producto_id=det.producto_id,
            leyenda=det.leyenda,
            cantidad=det.cantidad,
            precio_unitario=det.precio_unitario,
            entregado=det.entregado,
            subtotal=det.subtotal
        )
        db.add(db_det)
        
    # 4. Actualizar número de correlativo
    pv.prox_pedido += 1
    
    # 5. Volcar Transacción Completa "Atomica"
    db.commit()
    db.refresh(db_pedido)
    
    return db_pedido

def get_pedidos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Pedido).order_by(Pedido.id.desc()).offset(skip).limit(limit).all()

def get_pedido(db: Session, pedido_id: int):
    return db.query(Pedido).filter(Pedido.id == pedido_id).first()

def get_stock_comprometido(db: Session, producto_id: int) -> float:
    """
    Calcula la cantidad de mercadería comprometida para un producto.
    Es la suma de (cantidad - entregado) en pedidos activos (Pendiente o Parcial).
    """
    comprometido = db.query(func.sum(PedidoDetalle.cantidad - PedidoDetalle.entregado)) \
                     .join(Pedido) \
                     .filter(PedidoDetalle.producto_id == producto_id) \
                     .filter(Pedido.estado.in_(["Pendiente", "Parcial"])) \
                     .scalar()
                     
    return float(comprometido or 0.0)
