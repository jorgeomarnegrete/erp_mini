from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from models.user import User
from models.categoria import Categoria
from models.plantilla import PlantillaDocumento
from schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
from schemas.producto_import import ImportProductoResumen, ImportProductoConfirmarResponse
from crud import producto as crud_prod
from crud import producto_import as crud_producto_import
from crud.empresa import get_empresa
from core.pdf_generator import generar_pdf_desde_html
from routers.auth import get_current_user

router = APIRouter(prefix="/api/productos", tags=["producto"])


@router.post("/actualizar/preview", response_model=ImportProductoResumen)
async def preview_actualizar_productos(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Analiza la planilla ARTICULOS.xlsx de Tango sin escribir nada en la base, y devuelve un resumen clasificado"""
    file_bytes = await file.read()
    clasificados = crud_producto_import.clasificar_productos(db, file_bytes)
    resumen = crud_producto_import.resumir(clasificados)
    return {**resumen, "productos": clasificados}


@router.post("/actualizar/confirmar", response_model=ImportProductoConfirmarResponse)
async def confirmar_actualizar_productos(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ejecuta la actualización: crea las categorías y productos que faltan"""
    file_bytes = await file.read()
    try:
        creados, categorias_creadas = crud_producto_import.aplicar_importacion(db, file_bytes)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return {"creados": creados, "categorias_creadas": categorias_creadas}


@router.get("", response_model=list[ProductoResponse])
async def read_all_productos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Apertura total de inventarios (Incluyendo Matrices Anidadas)"""
    return crud_prod.get_all(db)

@router.get("/alertas/stock-minimo")
async def get_alerta_stock_minimo(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Conteo de productos activos por debajo del stock mínimo (excluye los que no tienen stock mínimo configurado)"""
    return {"cantidad": crud_prod.count_bajo_stock_minimo(db)}

@router.get("/alertas/stock-minimo/pdf")
async def export_reporte_stock_minimo_pdf(categoria_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Genera el PDF del reporte de productos bajo stock mínimo, opcionalmente filtrado por familia"""
    items = crud_prod.get_bajo_stock_minimo(db, categoria_id=categoria_id)

    empresa = get_empresa(db)
    if not empresa:
        raise HTTPException(status_code=500, detail="Configuración de empresa no encontrada")

    plantilla = db.query(PlantillaDocumento).filter(PlantillaDocumento.tipo_documento == 'REPORTE_STOCK_MINIMO', PlantillaDocumento.activa == True).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No hay una plantilla activa para REPORTE_STOCK_MINIMO")

    familia_label = "Todas"
    if categoria_id:
        categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
        familia_label = categoria.nombre if categoria else "Todas"

    try:
        datos_jinja = {
            "productos": items,
            "empresa": empresa,
            "total": len(items),
            "fecha_generacion": datetime.now(),
            "filtros": {
                "familia_label": familia_label,
            },
        }
        pdf_bytes = generar_pdf_desde_html(plantilla.codigo_html, datos_jinja)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=Reporte_Stock_Minimo.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")

@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_producto(prod_in: ProductoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creación Master de Producto y de Sub-precios a Medida"""
    if crud_prod.get_by_codigo_interno(db, prod_in.codigo_interno):
        raise HTTPException(status_code=400, detail="Ese Código (SKU) ya está asignado a otro producto.")
    if prod_in.codigo_barras and crud_prod.get_by_codigo_barras(db, prod_in.codigo_barras):
        raise HTTPException(status_code=400, detail="Este Código de Barras ya fue escaneado en otro artículo existente.")
        
    return crud_prod.create(db=db, record_in=prod_in)

@router.put("/{record_id}", response_model=ProductoResponse)
async def update_producto(record_id: int, prod_in: ProductoUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Actualización integral de Producto Destructiva para su Matriz"""
    db_record = crud_prod.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="SKU No Encontrado.")
    
    # Validaciones Anti-Duplicación Cautelosas
    if prod_in.codigo_interno is not None and prod_in.codigo_interno != db_record.codigo_interno:
        if crud_prod.get_by_codigo_interno(db, prod_in.codigo_interno):
            raise HTTPException(status_code=400, detail="El Código Interno deseado pertenece a otra familia.")
    
    if prod_in.codigo_barras is not None and prod_in.codigo_barras != db_record.codigo_barras and prod_in.codigo_barras != "":
        if crud_prod.get_by_codigo_barras(db, prod_in.codigo_barras):
            raise HTTPException(status_code=400, detail="Violación Técnica: El código de barras ya existe.")
            
    return crud_prod.update(db=db, db_record=db_record, record_update=prod_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_record = crud_prod.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Objeto Inexistente.")
        
    crud_prod.delete(db=db, db_record=db_record)
    return None

@router.get("/{record_id}/stock-disponible")
async def get_stock_disponible(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Calcula al vuelo el stock real disponible restando la mercadería comprometida en pedidos"""
    db_record = crud_prod.get_by_id(db, record_id=record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Producto Inexistente.")
        
    from crud import pedido as crud_pedido
    from crud import orden_produccion as crud_op
    comprometido_pedidos = crud_pedido.get_stock_comprometido(db, producto_id=record_id)
    comprometido_op = crud_op.get_stock_comprometido_op(db, producto_id=record_id)
    comprometido = comprometido_pedidos + comprometido_op

    return {
        "producto_id": record_id,
        "stock_actual": db_record.stock_actual,
        "comprometido": comprometido,
        "comprometido_pedidos": comprometido_pedidos,
        "comprometido_op": comprometido_op,
        "disponible": db_record.stock_actual - comprometido
    }
