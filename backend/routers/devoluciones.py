from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from database import get_db
from models.user import User
from schemas.devolucion import DevolucionCreate, DevolucionResponse, DevolucionListResponse
from crud import devolucion as crud_devolucion
from crud.empresa import get_empresa
from routers.auth import get_current_user
from models.plantilla import PlantillaDocumento
from core.pdf_generator import generar_pdf_desde_html

router = APIRouter(prefix="/api/devoluciones", tags=["devoluciones"])

@router.get("", response_model=DevolucionListResponse)
async def read_devoluciones(
    skip: int = 0,
    limit: int = 50,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    cliente_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene el historial de devoluciones, paginado y filtrable por fecha/cliente"""
    items, total = crud_devolucion.get_devoluciones(
        db, skip=skip, limit=limit,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, cliente_id=cliente_id,
    )
    return {"items": items, "total": total}

@router.get("/{devolucion_id}", response_model=DevolucionResponse)
async def read_devolucion(devolucion_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene una devolución específica"""
    db_devolucion = crud_devolucion.get_devolucion(db, devolucion_id=devolucion_id)
    if not db_devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada")
    return db_devolucion

@router.post("", response_model=DevolucionResponse, status_code=status.HTTP_201_CREATED)
async def create_devolucion(devolucion_in: DevolucionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea una nueva devolución y devuelve el stock correspondiente"""
    try:
        return crud_devolucion.create_devolucion(db=db, devolucion_in=devolucion_in, user_id=current_user.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{devolucion_id}/pdf")
async def export_pdf(devolucion_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Genera el PDF de la devolución en tiempo real, para que lo firme el transportista"""
    devolucion = crud_devolucion.get_devolucion(db, devolucion_id)
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada")

    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Configuración de empresa no encontrada")

    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'DEVOLUCION', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla activa para DEVOLUCION")

    try:
        datos_jinja = {
            "devolucion": devolucion,
            "empresa": empresa,
            "detalles": devolucion.detalles,
            "cliente": devolucion.cliente,
            "transporte": devolucion.transporte,
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=Devolucion_{devolucion.numero_comprobante}.pdf"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")
