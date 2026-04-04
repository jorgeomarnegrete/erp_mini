from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.cotizacion import CotizacionCreate, CotizacionResponse
from crud.cotizacion import create_cotizacion, get_cotizaciones, get_cotizacion
from crud.empresa import get_empresa
from routers.auth import get_current_user
from models.plantilla import PlantillaDocumento

# PDF Generator
from core.pdf_generator import generar_pdf_desde_html

router = APIRouter(prefix="/api/cotizaciones", tags=["cotizaciones"])

@router.get("", response_model=List[CotizacionResponse])
async def list_cotizaciones(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista las cotizaciones recientes"""
    return get_cotizaciones(db, skip=skip, limit=limit)

@router.post("", response_model=CotizacionResponse)
async def create_new_cotizacion(cot_in: CotizacionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Genera Cotización y descuenta el numerador del Punto de Venta"""
    try:
        return create_cotizacion(db=db, cot_in=cot_in)
    except HTTPException as httpe:
        # Re-raise standard Http exceptions bubbling from crud
        raise httpe
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{cotizacion_id}/pdf")
async def export_pdf(cotizacion_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Desenfunda el motor de PDFs y genera en tiempo real el diseño"""
    cotizacion = get_cotizacion(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no existe")
        
    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Identidad Corporativa no fundada. Entra a Configuración.")
        
    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'COTIZACION', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla visual HTML activa para COTIZACION.")
        
    try:
        datos_jinja = {
            "cotizacion": cotizacion,
            "empresa": empresa,
            "detalles": cotizacion.detalles,
            "vendedor": cotizacion.vendedor,
            "cliente": cotizacion.cliente
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=Cotizacion_{cotizacion.numero_comprobante}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al renderizar FPDF2: {str(e)}")
