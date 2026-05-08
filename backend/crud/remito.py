from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from models.remito import Remito, RemitoDetalle
from models.pedido import Pedido, PedidoDetalle
from models.punto_venta import PuntoVenta
from models.stk_mov import StkMov
from schemas.remito import RemitoCreate

def create_remito(db: Session, remito_in: RemitoCreate, user_id: int):
    # 1. Recuperar Punto De Venta para auto-numeración
    pv = db.query(PuntoVenta).filter(PuntoVenta.id == remito_in.punto_venta_id).first()
    if not pv:
        raise HTTPException(status_code=400, detail="Punto de Venta no válido")
        
    numero_asignado = pv.prox_remito
    
    # 2. Generar Cabecera
    db_remito = Remito(
        punto_venta_id=remito_in.punto_venta_id,
        numero_comprobante=numero_asignado,
        cliente_id=remito_in.cliente_id,
        usuario_id=user_id,
        pedido_id=remito_in.pedido_id,
        descuenta_stock=remito_in.descuenta_stock,
        observaciones=remito_in.observaciones,
        total=remito_in.total
    )
    db.add(db_remito)
    db.flush() # Genera el id de remito
    
    # 3. Generar Renglones y manejar lógica vinculada
    for det in remito_in.detalles:
        db_det = RemitoDetalle(
            remito_id=db_remito.id,
            producto_id=det.producto_id,
            id_pedido_detalle=det.id_pedido_detalle,
            cantidad=det.cantidad,
            precio_unitario=det.precio_unitario,
            subtotal=det.subtotal
        )
        db.add(db_det)
        
        # Lógica de Pedido: Actualizar 'entregado'
        if det.id_pedido_detalle:
            ped_det = db.query(PedidoDetalle).filter(PedidoDetalle.id == det.id_pedido_detalle).first()
            if ped_det:
                ped_det.entregado += det.cantidad
        
        # Lógica de Stock: Generar Movimiento si corresponde
        if remito_in.descuenta_stock:
            mov = StkMov(
                id_usuario=user_id,
                id_producto=det.producto_id,
                motivo=f"Remito {pv.numero:04d}-{numero_asignado:08d}",
                cantidad=det.cantidad,
                tipo=2 # Salida
            )
            db.add(mov)

    # 4. Actualizar estado del Pedido si corresponde
    if remito_in.pedido_id:
        pedido = db.query(Pedido).filter(Pedido.id == remito_in.pedido_id).first()
        if pedido:
            # Verificar si todos los ítems están entregados
            total_pedido = db.query(func.sum(PedidoDetalle.cantidad)).filter(PedidoDetalle.pedido_id == pedido.id).scalar() or 0
            total_entregado = db.query(func.sum(PedidoDetalle.entregado)).filter(PedidoDetalle.pedido_id == pedido.id).scalar() or 0
            
            if total_entregado >= total_pedido:
                pedido.estado = "Completado"
            elif total_entregado > 0:
                pedido.estado = "Parcial"
                
    # 5. Actualizar número de correlativo
    pv.prox_remito += 1
    
    db.commit()
    db.refresh(db_remito)
    
    return db_remito

def get_remitos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Remito).order_by(Remito.id.desc()).offset(skip).limit(limit).all()

def get_remito(db: Session, remito_id: int):
    return db.query(Remito).filter(Remito.id == remito_id).first()

def get_pedidos_pendientes_cliente(db: Session, cliente_id: int):
    """Obtiene pedidos que tienen ítems con saldo pendiente de entrega"""
    pedidos = db.query(Pedido).filter(
        Pedido.cliente_id == cliente_id,
        Pedido.estado.in_(["Pendiente", "Parcial"])
    ).all()
    return pedidos
