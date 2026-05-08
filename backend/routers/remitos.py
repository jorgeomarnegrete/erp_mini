from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from schemas.remito import RemitoCreate, RemitoResponse
from schemas.pedido import PedidoResponse
from crud import remito as crud_remito
from crud.empresa import get_empresa
from routers.auth import get_current_user
from models.plantilla import PlantillaDocumento
from core.pdf_generator import generar_pdf_desde_html

router = APIRouter(prefix="/api/remitos", tags=["remitos"])

@router.get("", response_model=List[RemitoResponse])
async def read_remitos(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene el historial de remitos"""
    return crud_remito.get_remitos(db, skip=skip, limit=limit)

@router.get("/{remito_id}", response_model=RemitoResponse)
async def read_remito(remito_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene un remito específico"""
    db_remito = crud_remito.get_remito(db, remito_id=remito_id)
    if not db_remito:
        raise HTTPException(status_code=404, detail="Remito no encontrado")
    return db_remito

@router.post("", response_model=RemitoResponse, status_code=status.HTTP_201_CREATED)
async def create_remito(remito_in: RemitoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea un nuevo remito"""
    try:
        return crud_remito.create_remito(db=db, remito_in=remito_in, user_id=current_user.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pendientes-cliente/{cliente_id}", response_model=List[PedidoResponse])
async def read_pedidos_pendientes(cliente_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene pedidos pendientes para un cliente específico"""
    return crud_remito.get_pedidos_pendientes_cliente(db, cliente_id=cliente_id)

@router.get("/{remito_id}/pdf")
async def export_pdf(remito_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Genera el PDF del remito en tiempo real"""
    remito = crud_remito.get_remito(db, remito_id)
    if not remito:
        raise HTTPException(status_code=404, detail="Remito no encontrado")
        
    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Configuración de empresa no encontrada")
        
    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'REMITO', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla activa para REMITO")
        
    try:
        datos_jinja = {
            "remito": remito,
            "empresa": empresa,
            "detalles": remito.detalles,
            "cliente": remito.cliente
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=Remito_{remito.numero_comprobante}.pdf"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")
