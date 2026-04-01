from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.empresa import EmpresaUpdate, EmpresaResponse
from crud.empresa import get_empresa, update_empresa
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/empresa", tags=["empresa"])

@router.get("", response_model=EmpresaResponse)
async def read_empresa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lectura general del padrón de Empresa (Disponible para mostrar PDF a empleados etc)"""
    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=404, detail="El sistema no posee cabecera fiscal inicializada.")
    return empresa

@router.put("", response_model=EmpresaResponse)
async def modify_empresa(emp_in: EmpresaUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Actualización del Perfil Empresa - Solo para Administradores Jefes"""
    return update_empresa(db=db, record_update=emp_in)
