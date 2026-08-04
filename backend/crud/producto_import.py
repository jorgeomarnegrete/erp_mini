import openpyxl
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.producto import Producto
from models.categoria import Categoria

# Índices de columnas esperados en ARTICULOS.xlsx exportada por Tango
COL_NOM_FAM = 1
COL_COD_ARTIC = 2
COL_DESCRIP = 3
COL_UNIDADMED = 4

# Mapeo empírico NOM_FAM (Tango) -> categoria_id local, derivado cruzando esta
# misma planilla contra los 633 productos que ya matchean por código interno
# (ver sesión 2026-08-04): mapeo 1 a 1 limpio, sin ambigüedad.
FAMILIA_A_CATEGORIA_ID = {
    "": 1,  # Mercadería General
    "EMBOLSADOS": 2,
    "ESTABLECIMIENTO MUNINI S.R.L.": 3,
    "ENVASADOS AL VACIO": 4,
    "PAPAS FINCA BALCARCE": 5,
    "MARISCOS NACIONALES E IMPORTAD": 6,
    "PESCADO DE MAR CONGELADO": 7,
    "PESCADO DE MAR FRESCO": 8,
    "PESCADO DE RIO CONGELADO": 9,
    "PESCADO DE RIO FRESCO": 10,
    "LUIS SOLIMENO E HIJOS S.A.": 11,
    "INSUMOS SUSHI": 12,
    "VARIOS": 13,
}

# Familias de Tango sin categoría equivalente local: se crean como categoría
# nueva la primera vez que aparece un producto de esa familia.
TASA_IVA_ID_DEFAULT = 1  # IVA General 21% — el único usado hoy en todo el catálogo


def _parse_rows(file_bytes: bytes):
    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo. Debe ser un .xlsx válido.")

    ws = wb.worksheets[0]
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not r[COL_COD_ARTIC]:
            continue
        cod = str(r[COL_COD_ARTIC]).strip()
        if not cod:
            continue
        rows.append({
            "codigo_interno": cod,
            "nombre": str(r[COL_DESCRIP]).strip() if r[COL_DESCRIP] else cod,
            "familia": str(r[COL_NOM_FAM]).strip() if r[COL_NOM_FAM] else "",
            "unidad": str(r[COL_UNIDADMED]).strip() if r[COL_UNIDADMED] else "Unidades",
        })
    return rows


def clasificar_productos(db: Session, file_bytes: bytes):
    """Parsea la planilla y clasifica cada producto sin escribir nada en la base."""
    rows = _parse_rows(file_bytes)
    existentes = {p.codigo_interno for p in db.query(Producto.codigo_interno).all()}

    resultado = []
    for r in rows:
        item = {
            "codigo_interno": r["codigo_interno"],
            "nombre": r["nombre"],
            "familia": r["familia"] or None,
            "categoria_nueva": None,
            "clasificacion": None,
            "motivo": None,
            "_raw": r,
        }

        if r["codigo_interno"] in existentes:
            item["clasificacion"] = "sin_cambios"
            resultado.append(item)
            continue

        item["clasificacion"] = "nuevo"
        if r["familia"] not in FAMILIA_A_CATEGORIA_ID:
            item["categoria_nueva"] = r["familia"] or "VARIOS"
        resultado.append(item)

    return resultado


def resumir(clasificados: list) -> dict:
    resumen = {"nuevos": 0, "sin_cambios": 0, "sin_codigo": 0, "categorias_nuevas": []}
    categorias_vistas = set()
    for item in clasificados:
        if item["clasificacion"] == "nuevo":
            resumen["nuevos"] += 1
            if item["categoria_nueva"] and item["categoria_nueva"] not in categorias_vistas:
                categorias_vistas.add(item["categoria_nueva"])
                resumen["categorias_nuevas"].append(item["categoria_nueva"])
        elif item["clasificacion"] == "sin_cambios":
            resumen["sin_cambios"] += 1
        else:
            resumen["sin_codigo"] += 1
    return resumen


def aplicar_importacion(db: Session, file_bytes: bytes):
    clasificados = clasificar_productos(db, file_bytes)

    categoria_id_por_nombre = dict(FAMILIA_A_CATEGORIA_ID)
    categorias_creadas = 0
    creados = 0

    for item in clasificados:
        if item["clasificacion"] != "nuevo":
            continue

        r = item["_raw"]
        familia = r["familia"]

        if familia not in categoria_id_por_nombre:
            nombre_categoria = familia or "VARIOS"
            nueva_cat = Categoria(nombre=nombre_categoria, activo=True)
            db.add(nueva_cat)
            db.flush()
            categoria_id_por_nombre[familia] = nueva_cat.id
            categorias_creadas += 1

        db.add(Producto(
            codigo_interno=r["codigo_interno"],
            nombre=r["nombre"],
            categoria_id=categoria_id_por_nombre[familia],
            tasa_iva_id=TASA_IVA_ID_DEFAULT,
            costo_neto=0.0,
            stock_actual=0.0,
            stock_minimo=0.0,
            unidad=r["unidad"],
            activo=True,
        ))
        creados += 1

    db.commit()
    return creados, categorias_creadas
