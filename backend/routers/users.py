from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.user import UserCreate, UserUpdate, UserResponse, MenuTree
from crud import user as crud_user
from routers.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api", tags=["users_and_menus"])

# Endpoints especiales para Menus

@router.get("/menus/tree", response_model=list[MenuTree])
async def get_all_menu_tree(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Devuelve todo el árbol posible, solo para admins (CRUD configuracion), o si tuvieramos un gestor.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud_user.get_menu_tree(db)

# Endpoints Usuarios

@router.get("/users", response_model=list[UserResponse])
async def read_all_users(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    return crud_user.get_users(db)

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_user = crud_user.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    return crud_user.create_user(db=db, user=user_in)

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_in: UserUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_user = crud_user.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_in.email is not None and user_in.email != db_user.email:
        check_email = crud_user.get_user_by_email(db, email=user_in.email)
        if check_email:
            raise HTTPException(status_code=400, detail="Email ya registrado por otro usuario")
            
    return crud_user.update_user(db=db, db_user=db_user, user_update=user_in)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    db_user = crud_user.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta autologueada")
        
    crud_user.delete_user(db=db, db_user=db_user)
    return None
