from sqlalchemy.orm import Session
from models.user import User, Menu
from schemas.user import UserCreate, UserUpdate
from core.security import get_password_hash

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).order_by(User.id.asc()).offset(skip).limit(limit).all()

def get_menus(db: Session):
    return db.query(Menu).order_by(Menu.orden.asc()).all()

def get_menu_tree(db: Session):
    # Solamente padres
    return db.query(Menu).filter(Menu.parent_id == None).order_by(Menu.orden.asc()).all()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    menus_db = []
    if user.menu_ids:
        menus_db = db.query(Menu).filter(Menu.id.in_(user.menu_ids)).all()

    db_user = User(
        email=user.email,
        nombre=user.nombre,
        hashed_password=hashed_password,
        is_admin=user.is_admin,
        menus=menus_db
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: User, user_update: UserUpdate):
    if user_update.email is not None:
        db_user.email = user_update.email
    if user_update.nombre is not None:
        db_user.nombre = user_update.nombre
    if user_update.is_admin is not None:
        db_user.is_admin = user_update.is_admin
    if user_update.password is not None and user_update.password.strip():
        db_user.hashed_password = get_password_hash(user_update.password)
        
    if user_update.menu_ids is not None:
        menus_db = db.query(Menu).filter(Menu.id.in_(user_update.menu_ids)).all()
        db_user.menus = menus_db
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, db_user: User):
    db.delete(db_user)
    db.commit()
    return db_user
