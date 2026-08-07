from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from database import get_db
from schemas.remito_compra import RemitoCompraCreate, RemitoCompraResponse, RemitoCompraObservacionesUpdate, RemitoCompraEncabezadoUpdate, RemitoCompraListResponse
from crud import remito_compra as remito_comp_crud
from crud.empresa import get_empresa
from routers.auth import get_current_user
from models.user import User
from models.plantilla import PlantillaDocumento
from core.pdf_generator import generar_pdf_desde_html

router = APIRouter(prefix="/api/remitos-compra", tags=["Remitos Compra"])

@router.post("/", response_model=RemitoCompraResponse)
def create_remito(
    remito_in: RemitoCompraCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return remito_comp_crud.create_remito_compra(db, remito_in, current_user.id)

@router.get("/", response_model=RemitoCompraListResponse)
def read_remitos(
    skip: int = 0,
    limit: int = 50,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    proveedor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total = remito_comp_crud.get_remitos_compra(
        db, skip=skip, limit=limit,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, proveedor_id=proveedor_id,
    )
    return {"items": items, "total": total}

@router.get("/control/pendientes", response_model=List[RemitoCompraResponse])
def read_remitos_pendientes_control(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return remito_comp_crud.get_remitos_pendientes_control(db)

@router.post("/control/escanear-item")
def scan_item(
    remito_id: int,
    producto_id: int,
    nro_lote: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return remito_comp_crud.procesar_escaneo_item(db, remito_id, producto_id, nro_lote, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{remito_id}/observaciones", response_model=RemitoCompraResponse)
def update_observaciones(
    remito_id: int,
    payload: RemitoCompraObservacionesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_remito = remito_comp_crud.update_observaciones(db, remito_id, payload.observaciones)
    if db_remito is None:
        raise HTTPException(status_code=404, detail="Remito de compra no encontrado")
    return db_remito

@router.patch("/{remito_id}/encabezado", response_model=RemitoCompraResponse)
def update_encabezado(
    remito_id: int,
    payload: RemitoCompraEncabezadoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_remito = remito_comp_crud.update_encabezado(
        db, remito_id,
        proveedor_id=payload.proveedor_id,
        numero_remito=payload.numero_remito,
        fecha=payload.fecha,
        observaciones=payload.observaciones,
    )
    if db_remito is None:
        raise HTTPException(status_code=404, detail="Remito de compra no encontrado")
    return db_remito

@router.get("/{remito_id}", response_model=RemitoCompraResponse)
def read_remito(
    remito_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_remito = remito_comp_crud.get_remito_compra(db, remito_id=remito_id)
    if db_remito is None:
        raise HTTPException(status_code=404, detail="Remito de compra no encontrado")
    return db_remito

@router.get("/{remito_id}/pdf")
async def export_pdf(remito_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Genera el PDF del remito de compra en tiempo real"""
    remito = remito_comp_crud.get_remito_compra(db, remito_id)
    if not remito:
        raise HTTPException(status_code=404, detail="Remito de compra no encontrado")

    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Configuración de empresa no encontrada")

    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'REMITO_COMPRA', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla activa para REMITO_COMPRA")

    try:
        datos_jinja = {
            "remito": remito,
            "empresa": empresa,
            "detalles": remito.detalles,
            "proveedor": remito.proveedor
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=RemitoCompra_{remito.numero_remito}.pdf"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")
