from sqlalchemy.orm import Session
from models.remito_compra import RemitoCompra, RemitoCompraDetalle
from models.producto import Producto, ProductoLoteStock
from schemas.remito_compra import RemitoCompraCreate

def create_remito_compra(db: Session, remito_in: RemitoCompraCreate, user_id: int):
    # 1. Generar Cabecera
    db_remito = RemitoCompra(
        numero_remito=remito_in.numero_remito,
        proveedor_id=remito_in.proveedor_id,
        usuario_id=user_id,
        afecta_stock=remito_in.afecta_stock,
        observaciones=remito_in.observaciones,
        total=remito_in.total
    )
    db.add(db_remito)
    db.flush() # Genera el id de remito
    
    # 2. Generar Renglones y manejar lógica de stock directo
    for det in remito_in.detalles:
        db_det = RemitoCompraDetalle(
            remito_compra_id=db_remito.id,
            producto_id=det.producto_id,
            cantidad=det.cantidad,
            precio_unitario=det.precio_unitario,
            subtotal=det.subtotal,
            nro_lote=det.nro_lote,
            fecha_vencimiento=det.fecha_vencimiento
        )
        db.add(db_det)
        
        # Lógica de Stock Directo: Actualizar stock_actual si corresponde
        if remito_in.afecta_stock:
            # A. Actualizar Stock Maestro
            producto = db.query(Producto).filter(Producto.id == det.producto_id).first()
            if producto:
                producto.stock_actual += det.cantidad
            
            # B. Actualizar Stock por Lote (Granular)
            if det.nro_lote:
                lote_stock = db.query(ProductoLoteStock).filter(
                    ProductoLoteStock.producto_id == det.producto_id,
                    ProductoLoteStock.nro_lote == det.nro_lote
                ).first()
                
                if lote_stock:
                    lote_stock.cantidad_actual += det.cantidad
                else:
                    lote_stock = ProductoLoteStock(
                        producto_id=det.producto_id,
                        nro_lote=det.nro_lote,
                        fecha_vencimiento=det.fecha_vencimiento,
                        cantidad_actual=det.cantidad
                    )
                    db.add(lote_stock)
    
    db.commit()
    db.refresh(db_remito)
    
    return db_remito

def get_remitos_compra(db: Session, skip: int = 0, limit: int = 100):
    return db.query(RemitoCompra).order_by(RemitoCompra.id.desc()).offset(skip).limit(limit).all()

def get_remitos_pendientes_control(db: Session):
    """Obtiene remitos que tienen artículos con saldo pendiente de escaneo"""
    from sqlalchemy import func
    return db.query(RemitoCompra).join(RemitoCompraDetalle).group_by(RemitoCompra.id).having(
        func.sum(RemitoCompraDetalle.cantidad) > func.sum(RemitoCompraDetalle.cantidad_recibida)
    ).all()

def procesar_escaneo_item(db: Session, remito_id: int, producto_id: int, nro_lote: str, user_id: int):
    # Buscar el detalle en este remito para este producto (y lote si viene)
    query = db.query(RemitoCompraDetalle).filter(
        RemitoCompraDetalle.remito_compra_id == remito_id,
        RemitoCompraDetalle.producto_id == producto_id
    )
    
    if nro_lote:
        query = query.filter(RemitoCompraDetalle.nro_lote == nro_lote)
    
    detalle = query.first()
    
    if not detalle:
        error_msg = f"El producto {producto_id}" + (f" con lote {nro_lote}" if nro_lote else "") + " no pertenece a este remito."
        raise Exception(error_msg)
    
    if detalle.cantidad_recibida >= detalle.cantidad:
        raise Exception("Este ítem ya fue recibido en su totalidad.")
    
    # 1. Incrementar cantidad recibida en el remito
    detalle.cantidad_recibida += 1
    
    # 2. Actualizar stock físico directamente (Regla de Oro)
    # A. Stock Maestro
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if producto:
        producto.stock_actual += 1
        
    # B. Stock por Lote (Granular)
    # Usamos el lote del detalle (que puede venir del escaneo o estar pre-cargado)
    lote_a_usar = nro_lote or detalle.nro_lote
    if lote_a_usar:
        lote_stock = db.query(ProductoLoteStock).filter(
            ProductoLoteStock.producto_id == producto_id,
            ProductoLoteStock.nro_lote == lote_a_usar
        ).first()
        
        if lote_stock:
            lote_stock.cantidad_actual += 1
        else:
            # Si no existe (raro si está cargado previamente), lo creamos
            lote_stock = ProductoLoteStock(
                producto_id=producto_id,
                nro_lote=lote_a_usar,
                fecha_vencimiento=detalle.fecha_vencimiento,
                cantidad_actual=1
            )
            db.add(lote_stock)
        
    db.commit()
    db.refresh(detalle)
    return detalle

def get_remito_compra(db: Session, remito_id: int):
    return db.query(RemitoCompra).filter(RemitoCompra.id == remito_id).first()
