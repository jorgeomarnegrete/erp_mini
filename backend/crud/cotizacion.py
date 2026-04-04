from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.cotizacion import Cotizacion, CotizacionDetalle
from models.punto_venta import PuntoVenta
from schemas.cotizacion import CotizacionCreate

def create_cotizacion(db: Session, cot_in: CotizacionCreate):
    # 1. Recuperar Punto De Venta para auto-numeración
    pv = db.query(PuntoVenta).filter(PuntoVenta.id == cot_in.punto_venta_id).first()
    if not pv:
        raise HTTPException(status_code=400, detail="Punto de Venta no válido")
        
    numero_asignado = pv.prox_cotizacion
    
    # 2. Generar Cabecera
    db_cot = Cotizacion(
        punto_venta_id=cot_in.punto_venta_id,
        numero_comprobante=numero_asignado,
        cliente_id=cot_in.cliente_id,
        vendedor_id=cot_in.vendedor_id,
        estado=cot_in.estado,
        observaciones=cot_in.observaciones,
        subtotal=cot_in.subtotal,
        descuento_porcentaje=cot_in.descuento_porcentaje,
        descuento_monto=cot_in.descuento_monto,
        total=cot_in.total
    )
    db.add(db_cot)
    db.flush() # Genera el id de cotizacion sin hacer commit completo
    
    # 3. Generar Renglones vinculados a la cabecera
    for det in cot_in.detalles:
        db_det = CotizacionDetalle(
            cotizacion_id=db_cot.id,
            producto_id=det.producto_id,
            descripcion=det.descripcion,
            cantidad=det.cantidad,
            precio_unitario=det.precio_unitario,
            subtotal=det.subtotal
        )
        db.add(db_det)
        
    # 4. Actualizar número de sucursal
    pv.prox_cotizacion += 1
    
    # 5. Volcar Transacción Completa "Atomica"
    db.commit()
    db.refresh(db_cot)
    
    return db_cot

def get_cotizaciones(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Cotizacion).order_by(Cotizacion.id.desc()).offset(skip).limit(limit).all()

def get_cotizacion(db: Session, cotizacion_id: int):
    return db.query(Cotizacion).filter(Cotizacion.id == cotizacion_id).first()
