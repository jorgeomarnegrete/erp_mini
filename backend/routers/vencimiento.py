from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models.user import User
from models.vencimiento import Vencimiento
from models.vehiculo import Vehiculo
from models.chofer import Chofer
from models.plantilla import PlantillaDocumento
from schemas.vencimiento import VencimientoCreate, VencimientoUpdate, VencimientoResponse
from crud import vencimiento as crud_venc
from crud.empresa import get_empresa
from core.pdf_generator import generar_pdf_desde_html
from routers.auth import get_current_user

router = APIRouter(prefix="/api/vencimientos", tags=["Vencimientos"])

@router.get("", response_model=List[VencimientoResponse])
def get_vencimientos(entidad_tipo: str, entidad_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_venc.get_by_entidad(db, entidad_tipo=entidad_tipo, entidad_id=entidad_id)

@router.get("/alertas/proximos")
def get_alerta_proximos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Conteo de vencimientos no finalizados dentro de su ventana de aviso"""
    return {"cantidad": crud_venc.count_proximos(db)}

@router.get("/reporte/pdf")
def export_reporte_agenda_pdf(
    fecha_desde: date,
    fecha_hasta: date,
    responsable_id: Optional[int] = None,
    entidad_tipo: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera el PDF de la Agenda de Vencimientos (Vehículos y Choferes), filtrado por rango de fechas, responsable y/o tipo"""
    items = crud_venc.get_for_reporte(db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, responsable_id=responsable_id, entidad_tipo=entidad_tipo)

    vehiculos_map = {v.id: v.descripcion for v in db.query(Vehiculo).all()}
    choferes_map = {c.id: c.nombre for c in db.query(Chofer).all()}

    hoy = date.today()
    filas = []
    for v in items:
        nombre_entidad = vehiculos_map.get(v.entidad_id) if v.entidad_tipo == "vehiculo" else choferes_map.get(v.entidad_id)
        if v.finalizado:
            estado = "Finalizado"
        elif v.fecha_vencimiento < hoy:
            estado = "Vencido"
        else:
            estado = "Pendiente"
        filas.append({
            "tipo_label": "Vehículo" if v.entidad_tipo == "vehiculo" else "Chofer",
            "entidad_nombre": nombre_entidad or "-",
            "tipo_documento": v.tipo_documento,
            "fecha_vencimiento": v.fecha_vencimiento,
            "responsable_nombre": v.responsable.nombre or v.responsable.email,
            "estado": estado,
        })

    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Configuración de empresa no encontrada")

    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'REPORTE_AGENDA_VENCIMIENTOS', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla activa para REPORTE_AGENDA_VENCIMIENTOS")

    responsable_label = "Todos"
    if responsable_id:
        resp = db.query(User).filter(User.id == responsable_id).first()
        responsable_label = (resp.nombre or resp.email) if resp else "Todos"

    tipo_label = {"vehiculo": "Vehículos", "chofer": "Choferes"}.get(entidad_tipo, "Todos")

    try:
        datos_jinja = {
            "filas": filas,
            "empresa": empresa,
            "total": len(filas),
            "fecha_generacion": datetime.now(),
            "filtros": {
                "fecha_desde": fecha_desde,
                "fecha_hasta": fecha_hasta,
                "responsable_label": responsable_label,
                "tipo_label": tipo_label,
            },
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=Agenda_Vencimientos.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")

@router.post("", response_model=VencimientoResponse, status_code=201)
def create_vencimiento(data: VencimientoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud_venc.create(db, data)

@router.put("/{vencimiento_id}", response_model=VencimientoResponse)
def update_vencimiento(vencimiento_id: int, data: VencimientoUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = db.query(Vencimiento).filter(Vencimiento.id == vencimiento_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    return crud_venc.update(db, db_record, data)

@router.delete("/{vencimiento_id}", status_code=204)
def delete_vencimiento(vencimiento_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = db.query(Vencimiento).filter(Vencimiento.id == vencimiento_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    crud_venc.delete(db, db_record)
    return None
