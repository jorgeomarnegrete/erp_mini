from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models.user import User
from models.producto import Producto
from models.plantilla import PlantillaDocumento
from schemas.stk_mov import StkMovCreate, StkMovOut, StkMovReporteResponse
from routers.auth import get_current_user
from crud import stk_mov as crud_stk_mov
from crud.empresa import get_empresa
from core.pdf_generator import generar_pdf_desde_html

router = APIRouter(prefix="/api/stk-mov", tags=["Movimientos de Stock"])

TIPO_LABELS = {1: "Entrada", 2: "Salida"}

@router.post("", response_model=List[StkMovOut])
def create_stk_mov(mov_data: StkMovCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creación de ajustes/movimientos de stock y actualización de inventario."""
    if mov_data.tipo not in [1, 2]:
        raise HTTPException(status_code=400, detail="El tipo debe ser 1 (Entrada) o 2 (Salida)")
    return crud_stk_mov.create_movimientos(db=db, mov_data=mov_data, user_id=current_user.id)

@router.get("", response_model=StkMovReporteResponse)
def get_stk_movs(
    tipo: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    producto_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtener el historial de movimientos de stock, paginado y filtrable (reporte)."""
    items, total = crud_stk_mov.get_movimientos_filtrados(
        db, tipo=tipo, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
        producto_id=producto_id, skip=skip, limit=limit,
    )
    return {"items": [crud_stk_mov.serializar_reporte_item(m) for m in items], "total": total}

@router.get("/reporte/pdf")
def export_reporte_pdf(
    tipo: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    producto_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera el PDF del reporte de movimientos de stock con los filtros aplicados"""
    items, total = crud_stk_mov.get_movimientos_filtrados(
        db, tipo=tipo, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, producto_id=producto_id,
    )

    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Configuración de empresa no encontrada")

    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'REPORTE_AJUSTE_STOCK', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla activa para REPORTE_AJUSTE_STOCK")

    producto_label = "Todos"
    if producto_id:
        producto = db.query(Producto).filter(Producto.id == producto_id).first()
        producto_label = producto.nombre if producto else "Todos"

    try:
        datos_jinja = {
            "movimientos": items,
            "empresa": empresa,
            "total": total,
            "fecha_generacion": datetime.now(),
            "filtros": {
                "tipo_label": TIPO_LABELS.get(tipo, "Todos"),
                "fecha_desde": fecha_desde,
                "fecha_hasta": fecha_hasta,
                "producto_label": producto_label,
            },
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=Reporte_Ajuste_Stock.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")
