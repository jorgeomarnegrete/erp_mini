from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.vehiculo import Vehiculo
from schemas.vehiculo import VehiculoCreate, VehiculoUpdate, VehiculoResponse

router = APIRouter(
    prefix="/api/vehiculos",
    tags=["Vehículos"]
)

@router.get("/", response_model=List[VehiculoResponse])
def get_vehiculos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Vehiculo).offset(skip).limit(limit).all()

@router.post("/", response_model=VehiculoResponse)
def create_vehiculo(vehiculo: VehiculoCreate, db: Session = Depends(get_db)):
    db_vehiculo = Vehiculo(**vehiculo.model_dump())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@router.put("/{vehiculo_id}", response_model=VehiculoResponse)
def update_vehiculo(vehiculo_id: int, vehiculo: VehiculoUpdate, db: Session = Depends(get_db)):
    db_vehiculo = db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    update_data = vehiculo.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehiculo, key, value)

    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@router.delete("/{vehiculo_id}")
def delete_vehiculo(vehiculo_id: int, db: Session = Depends(get_db)):
    db_vehiculo = db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehículo eliminado"}
