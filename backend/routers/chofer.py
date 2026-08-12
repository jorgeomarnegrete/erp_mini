from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.chofer import Chofer
from schemas.chofer import ChoferCreate, ChoferUpdate, ChoferResponse

router = APIRouter(
    prefix="/api/choferes",
    tags=["Choferes"]
)

@router.get("/", response_model=List[ChoferResponse])
def get_choferes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Chofer).offset(skip).limit(limit).all()

@router.post("/", response_model=ChoferResponse)
def create_chofer(chofer: ChoferCreate, db: Session = Depends(get_db)):
    db_chofer = Chofer(**chofer.model_dump())
    db.add(db_chofer)
    db.commit()
    db.refresh(db_chofer)
    return db_chofer

@router.put("/{chofer_id}", response_model=ChoferResponse)
def update_chofer(chofer_id: int, chofer: ChoferUpdate, db: Session = Depends(get_db)):
    db_chofer = db.query(Chofer).filter(Chofer.id == chofer_id).first()
    if not db_chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")

    update_data = chofer.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_chofer, key, value)

    db.commit()
    db.refresh(db_chofer)
    return db_chofer

@router.delete("/{chofer_id}")
def delete_chofer(chofer_id: int, db: Session = Depends(get_db)):
    db_chofer = db.query(Chofer).filter(Chofer.id == chofer_id).first()
    if not db_chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")

    db.delete(db_chofer)
    db.commit()
    return {"message": "Chofer eliminado"}
