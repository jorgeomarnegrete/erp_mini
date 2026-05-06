from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.stk_mov import StkMov
from models.producto import Producto
from schemas.stk_mov import StkMovCreate

def create_movimientos(db: Session, mov_data: StkMovCreate, user_id: int):
    created_movs = []
    
    try:
        for item in mov_data.items:
            producto = db.query(Producto).filter(Producto.id == item.id_producto).first()
            if not producto:
                raise HTTPException(status_code=404, detail=f"Producto con id {item.id_producto} no encontrado")
                
            if mov_data.tipo == 1:
                producto.stock_actual += item.cantidad
            elif mov_data.tipo == 2:
                producto.stock_actual -= item.cantidad
                
            nuevo_mov = StkMov(
                id_usuario=user_id,
                id_producto=item.id_producto,
                motivo=mov_data.motivo,
                cantidad=item.cantidad,
                tipo=mov_data.tipo
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
