import openpyxl
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.pedido import Pedido, PedidoDetalle
from models.cliente import Cliente
from models.producto import Producto
from models.punto_venta import PuntoVenta

# Índices de columnas esperados en la planilla exportada (fila de encabezado en la fila 1)
COL_FECHA_PEDI = 0
COL_FECHA_ENTR = 1
COL_NRO_PEDIDO = 3
COL_COD_CLIENT = 4
COL_RAZON_SOCI = 5
COL_ESTADO = 6
COL_COD_ARTIC = 10
COL_DESCRIP = 11
COL_CANTPEDIDA = 14
COL_IMP_TOTAL = 15


def _parse_rows(file_bytes: bytes):
    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo. Debe ser un .xlsx válido.")

    ws = wb.worksheets[0]
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or r[COL_NRO_PEDIDO] is None:
            continue
        rows.append({
            "fecha": r[COL_FECHA_PEDI],
            "fecha_entrega": r[COL_FECHA_ENTR],
            "nro_pedido": str(r[COL_NRO_PEDIDO]).strip(),
            "cod_cliente": str(r[COL_COD_CLIENT]).strip() if r[COL_COD_CLIENT] else "",
            "razon_social": str(r[COL_RAZON_SOCI]).strip() if r[COL_RAZON_SOCI] else "",
            "estado": str(r[COL_ESTADO]).strip() if r[COL_ESTADO] else "",
            "cod_articulo": str(r[COL_COD_ARTIC]).strip() if r[COL_COD_ARTIC] else "",
            "descripcion": str(r[COL_DESCRIP]).strip() if r[COL_DESCRIP] else "",
            "cantidad": float(r[COL_CANTPEDIDA] or 0),
            "importe": float(r[COL_IMP_TOTAL] or 0),
        })
    return rows


def _group_by_pedido(rows):
    grupos = {}
    for r in rows:
        grupos.setdefault(r["nro_pedido"], []).append(r)
    return grupos


def clasificar_pedidos(db: Session, file_bytes: bytes):
    """Parsea la planilla y clasifica cada pedido sin escribir nada en la base."""
    grupos = _group_by_pedido(_parse_rows(file_bytes))
    resultado = []

    for nro_pedido, lineas_raw in grupos.items():
        head = lineas_raw[0]
        item = {
            "origen_externo": nro_pedido,
            "cliente_codigo": head["cod_cliente"],
            "cliente_nombre": head["razon_social"],
            "cliente_id": None,
            "fecha": head["fecha"],
            "estado_erp": head["estado"],
            "clasificacion": None,
            "motivo": None,
            "total": 0.0,
            "lineas": [],
            "pedido_id_existente": None,
        }

        if head["estado"] != "Aprobado":
            item["clasificacion"] = "ignorado_estado"
            item["motivo"] = f"Estado '{head['estado']}' distinto de Aprobado"
            resultado.append(item)
            continue

        clientes_match = db.query(Cliente).filter(Cliente.codigo_interno == head["cod_cliente"]).all()
        if len(clientes_match) != 1:
            # Fallback para clientes que todavía no tienen codigo_interno vinculado
            # (ver "Actualizar Clientes" en la grilla de Clientes)
            clientes_match = db.query(Cliente).filter(Cliente.razon_social == head["razon_social"]).all()
        if len(clientes_match) != 1:
            item["clasificacion"] = "error"
            item["motivo"] = "Cliente no encontrado" if not clientes_match else "Cliente ambiguo (varios con el mismo nombre)"
            resultado.append(item)
            continue
        cliente = clientes_match[0]
        item["cliente_id"] = cliente.id

        lineas = []
        producto_faltante = None
        for lr in lineas_raw:
            prod = db.query(Producto).filter(Producto.codigo_interno == lr["cod_articulo"]).first()
            if not prod:
                producto_faltante = lr["cod_articulo"]
                break
            precio_unitario = round(lr["importe"] / lr["cantidad"], 4) if lr["cantidad"] else 0.0
            lineas.append({
                "producto_id": prod.id,
                "codigo_articulo": lr["cod_articulo"],
                "descripcion": lr["descripcion"],
                "cantidad": lr["cantidad"],
                "precio_unitario": precio_unitario,
                "subtotal": lr["importe"],
                "iva_porcentaje": prod.tasa_iva.valor if prod.tasa_iva else 0,
            })

        if producto_faltante:
            item["clasificacion"] = "error"
            item["motivo"] = f"Producto '{producto_faltante}' no encontrado (código interno)"
            resultado.append(item)
            continue

        item["lineas"] = lineas
        item["total"] = sum(l["subtotal"] for l in lineas)

        existente = db.query(Pedido).filter(Pedido.origen_externo == nro_pedido).first()
        if not existente:
            item["clasificacion"] = "nuevo"
        else:
            item["pedido_id_existente"] = existente.id
            tiene_entregas = any(d.entregado > 0 for d in existente.detalles)
            set_actual = sorted((d.producto_id, d.cantidad, d.precio_unitario) for d in existente.detalles)
            set_nuevo = sorted((l["producto_id"], l["cantidad"], l["precio_unitario"]) for l in lineas)
            mismo_cliente = existente.cliente_id == cliente.id

            if set_actual == set_nuevo and mismo_cliente:
                item["clasificacion"] = "sin_cambios"
            elif tiene_entregas:
                item["clasificacion"] = "error"
                item["motivo"] = "El pedido cambió pero ya tiene entregas registradas; requiere revisión manual"
            else:
                item["clasificacion"] = "modificado"

        resultado.append(item)

    return resultado


def resumir(clasificados: list) -> dict:
    resumen = {"nuevos": 0, "modificados": 0, "sin_cambios": 0, "errores": 0, "ignorados_estado": 0}
    for item in clasificados:
        clave = {
            "nuevo": "nuevos",
            "modificado": "modificados",
            "sin_cambios": "sin_cambios",
            "error": "errores",
            "ignorado_estado": "ignorados_estado",
        }[item["clasificacion"]]
        resumen[clave] += 1
    return resumen


def aplicar_importacion(db: Session, file_bytes: bytes, punto_venta_id: int, user_id: int):
    clasificados = clasificar_pedidos(db, file_bytes)

    pv = db.query(PuntoVenta).filter(PuntoVenta.id == punto_venta_id).first()
    if not pv:
        raise HTTPException(status_code=400, detail="Punto de Venta no válido")

    creados = 0
    actualizados = 0

    for item in clasificados:
        if item["clasificacion"] == "nuevo":
            cliente = db.query(Cliente).filter(Cliente.id == item["cliente_id"]).first()
            subtotal = sum(l["subtotal"] for l in item["lineas"])
            iva = sum(l["subtotal"] * (l["iva_porcentaje"] / 100) for l in item["lineas"])

            db_pedido = Pedido(
                punto_venta_id=punto_venta_id,
                numero_comprobante=pv.prox_pedido,
                cliente_id=item["cliente_id"],
                usuario_id=user_id,
                vendedor_id=cliente.vendedor_id,
                estado="Pendiente",
                subtotal=subtotal,
                iva=iva,
                total=subtotal + iva,
                origen_externo=item["origen_externo"],
            )
            db.add(db_pedido)
            db.flush()

            for l in item["lineas"]:
                db.add(PedidoDetalle(
                    pedido_id=db_pedido.id,
                    producto_id=l["producto_id"],
                    cantidad=l["cantidad"],
                    precio_unitario=l["precio_unitario"],
                    subtotal=l["subtotal"],
                ))
            pv.prox_pedido += 1
            creados += 1

        elif item["clasificacion"] == "modificado":
            db_pedido = db.query(Pedido).filter(Pedido.id == item["pedido_id_existente"]).first()
            subtotal = sum(l["subtotal"] for l in item["lineas"])
            iva = sum(l["subtotal"] * (l["iva_porcentaje"] / 100) for l in item["lineas"])

            db_pedido.cliente_id = item["cliente_id"]
            db_pedido.subtotal = subtotal
            db_pedido.iva = iva
            db_pedido.total = subtotal + iva

            for d in list(db_pedido.detalles):
                db.delete(d)
            db.flush()

            for l in item["lineas"]:
                db.add(PedidoDetalle(
                    pedido_id=db_pedido.id,
                    producto_id=l["producto_id"],
                    cantidad=l["cantidad"],
                    precio_unitario=l["precio_unitario"],
                    subtotal=l["subtotal"],
                ))
            actualizados += 1

    db.commit()
    return creados, actualizados
