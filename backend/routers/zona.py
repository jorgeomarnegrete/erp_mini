from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.zona import Zona
from schemas.zona import ZonaCreate, ZonaUpdate, ZonaResponse

router = APIRouter(
    prefix="/api/zonas",
    tags=["Zonas"]
)

@router.get("/", response_model=List[ZonaResponse])
def get_zonas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Zona).offset(skip).limit(limit).all()

@router.post("/", response_model=ZonaResponse)
def create_zona(zona: ZonaCreate, db: Session = Depends(get_db)):
    db_zona = Zona(**zona.model_dump())
    db.add(db_zona)
    db.commit()
    db.refresh(db_zona)
    return db_zona

@router.put("/{zona_id}", response_model=ZonaResponse)
def update_zona(zona_id: int, zona: ZonaUpdate, db: Session = Depends(get_db)):
    db_zona = db.query(Zona).filter(Zona.id == zona_id).first()
    if not db_zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    
    update_data = zona.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_zona, key, value)
        
    db.commit()
    db.refresh(db_zona)
    return db_zona

@router.delete("/{zona_id}")
def delete_zona(zona_id: int, db: Session = Depends(get_db)):
    db_zona = db.query(Zona).filter(Zona.id == zona_id).first()
    if not db_zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    
    db.delete(db_zona)
    db.commit()
    return {"message": "Zona eliminada"}
