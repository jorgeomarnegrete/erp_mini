import re
import openpyxl
from io import BytesIO
from collections import Counter
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.cliente import Cliente

# Índices de columnas esperados en la planilla CLIENTES.xlsx exportada por Tango
COL_COD_CLIENT = 0
COL_RAZON_SOCI = 1
COL_DOMICILIO = 4
COL_LOCALIDAD = 5
COL_TELEFONO_1 = 7
COL_TIPO_IVA = 9
COL_IDENTIFTRI = 13
COL_TIPO_DOC = 14
COL_E_MAIL = 21

# Mapeo empírico derivado de los ~3034 clientes ya cargados que matchean por CUIT
# contra esta misma planilla (ver sesión 2026-08-04): TIPO_DOC=80 (CUIT AFIP) es
# el único código que históricamente se guardó como tipo_doc_id=2 (CUIT); todo lo
# demás (CUIL, DNI, Consumidor Final genérico) se guardó como tipo_doc_id=1 (DNI).
TIPO_DOC_CUIT_AFIP = "80"
TIPO_DOC_ID_CUIT = 2
TIPO_DOC_ID_DNI = 1

# TIPO_IVA=RI -> Responsable Inscripto, EX -> Exento; todo lo demás (CF, RS, INR,
# NC) se guardó históricamente como Consumidor Final.
TIPO_RESP_ID_RESPONSABLE_INSCRIPTO = 1
TIPO_RESP_ID_EXENTO = 2
TIPO_RESP_ID_CONSUMIDOR_FINAL = 3


def _normalizar_documento(value):
    return re.sub(r"\D", "", value or "")


def _limpiar_texto(value):
    if not value:
        return ""
    # Tango exporta algunos campos con el artefacto literal "_x000D_" (CR escapado sin
    # decodificar) antes de un salto de línea real
    texto = str(value).replace("_x000D_", " ")
    texto = texto.replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", texto).strip()


def _parse_rows(file_bytes: bytes):
    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo. Debe ser un .xlsx válido.")

    ws = wb.worksheets[0]
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not r[COL_COD_CLIENT]:
            continue
        rows.append({
            "codigo_interno": str(r[COL_COD_CLIENT]).strip(),
            "razon_social": _limpiar_texto(r[COL_RAZON_SOCI]),
            "documento_raw": (r[COL_IDENTIFTRI] or "").strip() if r[COL_IDENTIFTRI] else "",
            "documento_norm": _normalizar_documento(r[COL_IDENTIFTRI]),
            "tipo_doc_erp": str(r[COL_TIPO_DOC]).strip() if r[COL_TIPO_DOC] else "",
            "tipo_iva_erp": str(r[COL_TIPO_IVA]).strip() if r[COL_TIPO_IVA] else "",
            "telefono": _limpiar_texto(r[COL_TELEFONO_1]),
            "email": _limpiar_texto(r[COL_E_MAIL]),
            "direccion": _limpiar_texto(r[COL_DOMICILIO]),
            "localidad": _limpiar_texto(r[COL_LOCALIDAD]),
        })
    return rows


def _mapear_tipo_doc_id(tipo_doc_erp: str) -> int:
    return TIPO_DOC_ID_CUIT if tipo_doc_erp == TIPO_DOC_CUIT_AFIP else TIPO_DOC_ID_DNI


def _mapear_tipo_resp_id(tipo_iva_erp: str) -> int:
    if tipo_iva_erp == "RI":
        return TIPO_RESP_ID_RESPONSABLE_INSCRIPTO
    if tipo_iva_erp == "EX":
        return TIPO_RESP_ID_EXENTO
    return TIPO_RESP_ID_CONSUMIDOR_FINAL


def clasificar_clientes(db: Session, file_bytes: bytes):
    """Parsea la planilla y clasifica cada cliente sin escribir nada en la base."""
    rows = _parse_rows(file_bytes)

    locales_por_documento = {}
    for c in db.query(Cliente).filter(Cliente.documento.isnot(None)).all():
        locales_por_documento[_normalizar_documento(c.documento)] = c

    conteo_documentos = Counter(r["documento_norm"] for r in rows if r["documento_norm"])

    resultado = []
    for r in rows:
        item = {
            "codigo_interno": r["codigo_interno"],
            "razon_social": r["razon_social"],
            "documento": r["documento_raw"] or None,
            "clasificacion": None,
            "motivo": None,
            "_raw": r,
            "_cliente_id_existente": None,
        }

        if not r["documento_norm"]:
            item["clasificacion"] = "sin_documento"
            item["motivo"] = "La planilla no trae CUIT/documento para este cliente"
            resultado.append(item)
            continue

        if conteo_documentos[r["documento_norm"]] > 1:
            item["clasificacion"] = "ambiguo"
            item["motivo"] = "Este CUIT aparece repetido en la planilla con distintos códigos de cliente"
            resultado.append(item)
            continue

        existente = locales_por_documento.get(r["documento_norm"])
        if existente:
            item["_cliente_id_existente"] = existente.id
            if existente.codigo_interno == r["codigo_interno"]:
                item["clasificacion"] = "sin_cambios"
            else:
                item["clasificacion"] = "vincular"
        else:
            item["clasificacion"] = "nuevo"

        resultado.append(item)

    return resultado


def resumir(clasificados: list) -> dict:
    resumen = {"a_vincular": 0, "nuevos": 0, "sin_cambios": 0, "sin_documento": 0, "ambiguos": 0}
    clave_por_clasificacion = {
        "vincular": "a_vincular",
        "nuevo": "nuevos",
        "sin_cambios": "sin_cambios",
        "sin_documento": "sin_documento",
        "ambiguo": "ambiguos",
    }
    for item in clasificados:
        resumen[clave_por_clasificacion[item["clasificacion"]]] += 1
    return resumen


def aplicar_importacion(db: Session, file_bytes: bytes):
    clasificados = clasificar_clientes(db, file_bytes)

    vinculados = 0
    creados = 0

    for item in clasificados:
        r = item["_raw"]

        if item["clasificacion"] == "vincular":
            cliente = db.query(Cliente).filter(Cliente.id == item["_cliente_id_existente"]).first()
            cliente.codigo_interno = item["codigo_interno"]
            vinculados += 1

        elif item["clasificacion"] == "nuevo":
            db.add(Cliente(
                razon_social=r["razon_social"],
                documento=r["documento_raw"],
                tipo_doc_id=_mapear_tipo_doc_id(r["tipo_doc_erp"]),
                tipo_resp_id=_mapear_tipo_resp_id(r["tipo_iva_erp"]),
                codigo_interno=r["codigo_interno"],
                telefono=r["telefono"] or None,
                email=r["email"] or None,
                direccion=r["direccion"] or None,
                localidad=r["localidad"] or None,
                activo=True,
            ))
            creados += 1

    db.commit()
    return vinculados, creados
