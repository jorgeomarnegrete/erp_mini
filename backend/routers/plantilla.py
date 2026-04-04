from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.plantilla import PlantillaDocumento
from schemas.plantilla import PlantillaResponse, PlantillaCreate
from routers.auth import get_current_user

router = APIRouter(prefix="/api/plantillas", tags=["plantillas"])

@router.get("", response_model=List[PlantillaResponse])
async def list_plantillas(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    return db.query(PlantillaDocumento).all()

@router.put("/{plantilla_id}", response_model=PlantillaResponse)
async def update_plantilla(plantilla_id: int, p_in: PlantillaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permiso denegado")
        
    db_p = db.query(PlantillaDocumento).filter(PlantillaDocumento.id == plantilla_id).first()
    if not db_p:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        
    db_p.codigo_html = p_in.codigo_html
    db_p.nombre = p_in.nombre
    db_p.activa = p_in.activa
    
    db.commit()
    db.refresh(db_p)
    return db_p
