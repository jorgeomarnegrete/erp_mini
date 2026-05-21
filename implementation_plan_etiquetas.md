# Impresión de Etiquetas Zebra con QZ Tray — Plan Final

Agregar al módulo de **Productos** un botón de acción "Imprimir Etiqueta" que:
1. Almacena todos los datos bromatológicos/fiscales del producto en una nueva tabla `producto_etiquetas` (relación 1-a-1 con `productos`).
2. Genera el código ZPL desde una **plantilla editable** tipo `ETIQUETA_ZPL`, integrada al sistema de Plantillas de Documentos existente.
3. Imprime a una Zebra física mediante **QZ Tray**, cuyo certificado digital es servido por el propio backend.

---

## Decisiones de Diseño Confirmadas

| Pregunta | Respuesta | Impacto |
|---|---|---|
| `elaborado_por` / `para_establecimiento` | Varían por producto | Se guardan en `producto_etiquetas` |
| Diseño ZPL | Editable | Se usa el sistema de Plantillas existente con tipo `ETIQUETA_ZPL` |
| Tamaño de etiqueta | 95 × 95 mm (editable) | ZPL base configurado en dots: 95 mm ≈ 760 dots a 8 dots/mm (203 dpi) |
| Certificado QZ Tray | Backend lo sirve | Nuevo endpoint `GET /api/qz/certificate` y `POST /api/qz/sign` |
| **Modelo de impresora** | **Zebra ZT230** | ZPL calibrado para ZT230 a 203 dpi, transfer térmico, interfaz USB/Ethernet |

---

## Proposed Changes

---

### BLOQUE 1 — Backend

#### [MODIFY] [producto.py](file:///C:/proyectos/factu_new/backend/models/producto.py)

Agregar la clase `ProductoEtiqueta` al final del archivo:

```python
class ProductoEtiqueta(Base):
    """Configuración de etiqueta bromatológica/fiscal por producto (1:1 con Producto)"""
    __tablename__ = "producto_etiquetas"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"),
                         unique=True, nullable=False)

    # --- Identificación Fiscal ---
    descripcion_larga     = Column(Text, nullable=True)
    senasa_nro            = Column(String, nullable=True)   # "3256/4430D/1"
    rnpa_nro              = Column(String, nullable=True)   # "4048/21054"
    industria_argentina   = Column(Boolean, default=True)
    peso_neto             = Column(String, nullable=True)   # "6 KG" (texto libre)

    # --- Tabla Nutricional (por porción) ---
    porcion_descripcion   = Column(String, nullable=True)   # "130 gr / 1 unidad"
    valor_energetico_kcal = Column(Float, nullable=True)
    valor_energetico_kj   = Column(Float, nullable=True)
    valor_energetico_vd   = Column(Integer, nullable=True)
    carbohidratos_g       = Column(Float, nullable=True)
    carbohidratos_vd      = Column(Integer, nullable=True)
    proteinas_g           = Column(Float, nullable=True)
    proteinas_vd          = Column(Integer, nullable=True)
    grasas_totales_g      = Column(Float, nullable=True)
    grasas_totales_vd     = Column(Integer, nullable=True)
    grasas_saturadas_g    = Column(Float, nullable=True)
    grasas_saturadas_vd   = Column(Integer, nullable=True)
    grasas_trans_g        = Column(Float, nullable=True)    # sin %VD (siempre ".")
    fibra_alimentaria_g   = Column(Float, nullable=True)
    fibra_alimentaria_vd  = Column(Integer, nullable=True)
    sodio_mg              = Column(Float, nullable=True)
    sodio_vd              = Column(Integer, nullable=True)

    # --- Textos Legales ---
    ingredientes          = Column(Text, nullable=True)
    conservacion          = Column(Text, nullable=True)     # multilinea con temperaturas
    elaborado_por         = Column(String, nullable=True)   # varía por producto
    para_establecimiento  = Column(String, nullable=True)   # varía por producto
    codigo_ep             = Column(String, nullable=True)   # "EP005"
    codigo_hm             = Column(String, nullable=True)   # "HM"

    producto = relationship("Producto", backref="etiqueta", uselist=False)
```

#### [MODIFY] [plantilla.py](file:///C:/proyectos/factu_new/backend/models/plantilla.py)

Agregar campo `codigo_zpl` para soportar el nuevo tipo `ETIQUETA_ZPL`:

```python
codigo_zpl = Column(Text, nullable=True)   # ZPL con variables Jinja2 (solo para tipo ETIQUETA_ZPL)
```

> [!NOTE]
> `codigo_html` se mantiene intacto. Sólo las plantillas de tipo `ETIQUETA_ZPL` usan `codigo_zpl`. Así el editor de Plantillas puede mostrar uno u otro según el tipo seleccionado.

---

#### [NEW] `backend/schemas/producto_etiqueta.py`

```python
from pydantic import BaseModel
from typing import Optional

class ProductoEtiquetaBase(BaseModel):
    descripcion_larga: Optional[str] = None
    senasa_nro: Optional[str] = None
    rnpa_nro: Optional[str] = None
    industria_argentina: bool = True
    peso_neto: Optional[str] = None
    porcion_descripcion: Optional[str] = None
    valor_energetico_kcal: Optional[float] = None
    valor_energetico_kj: Optional[float] = None
    valor_energetico_vd: Optional[int] = None
    carbohidratos_g: Optional[float] = None
    carbohidratos_vd: Optional[int] = None
    proteinas_g: Optional[float] = None
    proteinas_vd: Optional[int] = None
    grasas_totales_g: Optional[float] = None
    grasas_totales_vd: Optional[int] = None
    grasas_saturadas_g: Optional[float] = None
    grasas_saturadas_vd: Optional[int] = None
    grasas_trans_g: Optional[float] = None
    fibra_alimentaria_g: Optional[float] = None
    fibra_alimentaria_vd: Optional[int] = None
    sodio_mg: Optional[float] = None
    sodio_vd: Optional[int] = None
    ingredientes: Optional[str] = None
    conservacion: Optional[str] = None
    elaborado_por: Optional[str] = None
    para_establecimiento: Optional[str] = None
    codigo_ep: Optional[str] = None
    codigo_hm: Optional[str] = None

class ProductoEtiquetaCreate(ProductoEtiquetaBase):
    pass

class ProductoEtiquetaRead(ProductoEtiquetaBase):
    id: int
    producto_id: int
    class Config:
        from_attributes = True
```

---

#### [NEW] `backend/crud/producto_etiqueta.py`

```python
from sqlalchemy.orm import Session
from models.producto import ProductoEtiqueta
from schemas.producto_etiqueta import ProductoEtiquetaCreate

def get_by_producto(db: Session, producto_id: int):
    return db.query(ProductoEtiqueta).filter(
        ProductoEtiqueta.producto_id == producto_id).first()

def upsert(db: Session, producto_id: int, data: ProductoEtiquetaCreate):
    obj = get_by_producto(db, producto_id)
    if obj is None:
        obj = ProductoEtiqueta(producto_id=producto_id, **data.model_dump())
        db.add(obj)
    else:
        for k, v in data.model_dump().items():
            setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj
```

---

#### [NEW] `backend/routers/producto_etiqueta.py`

```
GET  /api/productos/{producto_id}/etiqueta   → retorna datos de etiqueta (404 si no existe)
PUT  /api/productos/{producto_id}/etiqueta   → crea o actualiza (upsert)
```

---

#### [NEW] `backend/routers/qz.py` — Endpoints para QZ Tray

QZ Tray necesita que el servidor le devuelva el certificado y firme un hash para autenticar la conexión segura.

```
GET  /api/qz/certificate   → devuelve el contenido de digital-certificate.txt (text/plain)
POST /api/qz/sign          → recibe {"hash": "..."}, firma con private-key.pem y devuelve la firma Base64
```

> [!IMPORTANT]
> El endpoint `/api/qz/sign` NO requiere autenticación JWT porque QZ Tray lo llama antes del login. Sin embargo, sólo responde a `POST` con el hash exacto, no expone la clave privada.

---

#### [MODIFY] [main.py](file:///C:/proyectos/factu_new/backend/main.py)

```python
# Agregar imports de modelo (para que SQLAlchemy cree las tablas en lifespan)
import models.producto        # ya existe — internamente ahora tiene ProductoEtiqueta

# Registrar los nuevos routers
from routers import producto_etiqueta, qz
app.include_router(producto_etiqueta.router)
app.include_router(qz.router)

# En el bloque lifespan: inyectar plantilla base ZPL si la tabla está vacía de tipo ETIQUETA_ZPL
```

**Zebra ZT230 — Especificaciones Técnicas Relevantes:**

| Parámetro | Valor |
|---|---|
| Resolución | **203 dpi** (8 dots/mm) |
| Método de impresión | Transferencia térmica (ribbon) / Térmica directa |
| Ancho máximo de impresión | 104 mm (832 dots) |
| Interfaces disponibles | USB, RS-232 Serial, Ethernet (LAN) |
| Lenguaje | ZPL II |
| Velocidad máxima | 152 mm/s |
| Etiqueta configurada | 95 × 95 mm → **760 × 760 dots** |

> [!IMPORTANT]
> La ZT230 soporta **ZPL II** de forma nativa. Los comandos `^XA...^XZ` funcionan directamente. QZ Tray envía el ZPL como `type: 'raw'`, `format: 'plain'` — sin conversión PDF ni rasterización.

**Comandos ZPL específicos de la ZT230 que se incluyen en la plantilla base:**

| Comando | Función |
|---|---|
| `^XA` / `^XZ` | Inicio y fin de etiqueta |
| `^PW760` | Page Width: 760 dots (95 mm) |
| `^LL760` | Label Length: 760 dots (95 mm) |
| `^MMT` | Media Mode Transfer (transfer térmico) — usar `^MMD` si es térmica directa |
| `^PR4` | Velocidad de impresión: 4 ips (~100 mm/s), valor conservador para calidad |
| `^MD10` | Media Darkness: oscuridad 10 (rango 0-30, ajustable por el usuario) |
| `^LH0,0` | Label Home: origen en esquina superior izquierda |
| `^CI28` | Codificación UTF-8 (soportada por ZT230 con firmware reciente) |
| `^CF0,N` | Fuente por defecto con tamaño N dots |
| `^FO x,y` | Field Origin: posición del campo |
| `^FD...^FS` | Field Data / Field Separator |
| `^GB w,h,t` | Graphic Box (líneas divisorias) |
| `^PQ N` | Print Quantity: imprime N copias (se inyecta dinámicamente desde el campo "Cantidad de copias") |

**Plantilla ZPL base inyectada automáticamente (tipo `ETIQUETA_ZPL`):**

```zpl
^XA
^PW760^LL760
^MMT
^PR4
^MD10
^LH0,0
^CI28
^CF0,35^FO30,20^FD{{ producto.nombre }}^FS
^CF0,22^FO30,65^FD{{ etiqueta.descripcion_larga }}^FS
^FO30,100^GB700,2,2^FS
^CF0,18
^FO30,110^FDSENASA Nº {{ etiqueta.senasa_nro }}   RNPA Nº {{ etiqueta.rnpa_nro }}^FS
^FO30,135^FDFECHA DE ELABORACIÓN: {{ fecha_elaboracion }}^FS
^FO30,158^FDLOTE: {{ nro_lote }}   PESO NETO: {{ etiqueta.peso_neto }}^FS
^FO30,180^GB700,2,2^FS
... (tabla nutricional y textos legales — ver glosario de variables)
^FO30,720^FDElaborado por: {{ etiqueta.elaborado_por }}  Para Establecimiento: {{ etiqueta.para_establecimiento }}^FS
^FO580,700^FD{{ etiqueta.codigo_ep }}  {{ etiqueta.codigo_hm }}^FS
^PQ{{ cantidad_copias }}
^XZ
```

---

### BLOQUE 2 — Frontend

#### [MODIFY] [Productos.jsx](file:///C:/proyectos/factu_new/frontend/src/pages/Productos.jsx)

**1. Nuevo botón en la columna Acciones** (junto a Editar y Eliminar):
```jsx
<button
  onClick={() => openLabelModal(prod)}
  className="text-teal-600 bg-teal-50 p-2 rounded-lg hover:bg-teal-600 hover:text-white transition-all shadow-sm"
  title="Imprimir Etiqueta"
>
  <Printer className="w-5 h-5" />
</button>
```

**2. Modal de Etiqueta con 2 Tabs:**

```
┌─────────────────────────────────────────────────┐
│  🖨️ Etiqueta — [nombre del producto]         [X] │
│                                                   │
│  [📋 Datos de Etiqueta]  [🖨️ Imprimir]           │
├─────────────────────────────────────────────────┤
│                                                   │
│  TAB 1: Formulario completo con todos los campos  │
│         agrupados en secciones colapsables:       │
│           • Identificación Fiscal                 │
│           • Tabla Nutricional                     │
│           • Textos Legales                        │
│         [Guardar datos de etiqueta]               │
│                                                   │
│  TAB 2: Campos dinámicos + botón imprimir:        │
│           • Fecha de Elaboración (date picker)    │
│           • Nro. de Lote (text)                   │
│           • Cantidad de copias (number, default 1)│
│         [▶ Conectar QZ Tray]                      │
│         [🖨️ Enviar a Zebra]                       │
└─────────────────────────────────────────────────┘
```

**3. Lógica QZ Tray en el frontend:**

```js
// Al abrir Tab 2:
//   1. qz.security.setCertificatePromise → fetch GET /api/qz/certificate
//   2. qz.security.setSignatureAlgorithm("SHA512")
//   3. qz.security.setSignaturePromise → fetch POST /api/qz/sign con {hash}
//   4. qz.websocket.connect()

// Configuración del printer para ZT230:
const config = qz.configs.create("ZDesigner ZT230-203dpi ZPL", {
  // Nombre exacto tal como aparece en Dispositivos e Impresoras de Windows
  // Alternativa si está en red: qz.configs.create("192.168.x.x", { port: 9100 })
  encoding: null,   // ZPL es raw, sin codificación adicional
  copies: 1         // Las copias se controlan con ^PQ en el ZPL
});

// Al hacer clic en "Enviar a Zebra":
//   1. Fetch GET /api/productos/{id}/etiqueta  → datos fijos
//   2. Fetch GET /api/plantillas?tipo=ETIQUETA_ZPL → plantilla ZPL (campo codigo_zpl)
//   3. Render con Nunjucks.js: nunjucks.renderString(plantilla.codigo_zpl, contexto)
//      donde contexto = { producto, etiqueta, fecha_elaboracion, nro_lote, cantidad_copias }
//   4. qz.print(config, [{type:'raw', format:'plain', data: zplRendered}])
```

> [!NOTE]
> Para renderizar el template ZPL en el frontend se usará **Nunjucks.js** (npm), que es 100% compatible con la sintaxis Jinja2 `{{ variable }}` y `{% for %}`. Esto evita hacer un round-trip al backend para renderizar el ZPL.

> [!IMPORTANT]
> **Nombre de impresora en Windows para la ZT230:** El nombre del driver instalado suele ser `"ZDesigner ZT230-203dpi ZPL"`. Se mostrará un campo editable en el Tab 2 para que el operario pueda ajustarlo si difiere. QZ Tray también soporta conexión directa por IP (`192.168.x.x:9100`) para cuando la ZT230 está en red por Ethernet — esto también será un campo configurable en el Tab 2.

---

#### [MODIFY] [PlantillasDocumentos.jsx](file:///C:/proyectos/factu_new/frontend/src/pages/PlantillasDocumentos.jsx)

- Al seleccionar una plantilla de tipo `ETIQUETA_ZPL`, mostrar el campo `codigo_zpl` en el editor en lugar de `codigo_html`.
- Cambiar el label del header: "HTML5 / CSS3 / Jinja2" → "ZPL / Jinja2" cuando el tipo es `ETIQUETA_ZPL`.
- Agregar en el panel de Glosario una nueva sección con todas las variables de etiqueta.

---

#### [MODIFY] `frontend/index.html`

Agregar el script de QZ Tray desde CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js"></script>
```

---

### BLOQUE 3 — Glosario de Variables ZPL

Variables disponibles en la plantilla `ETIQUETA_ZPL`:

| Variable | Descripción |
|---|---|
| `{{ producto.nombre }}` | Nombre del producto |
| `{{ producto.codigo_interno }}` | SKU interno |
| `{{ etiqueta.descripcion_larga }}` | Descripción larga |
| `{{ etiqueta.senasa_nro }}` | N° SENASA |
| `{{ etiqueta.rnpa_nro }}` | N° RNPA |
| `{{ etiqueta.industria_argentina }}` | Bool: Industria Argentina |
| `{{ etiqueta.peso_neto }}` | Peso neto (texto) |
| `{{ etiqueta.porcion_descripcion }}` | Porción (ej. "130 gr / 1 unidad") |
| `{{ etiqueta.valor_energetico_kcal }}` | Kcal |
| `{{ etiqueta.valor_energetico_kj }}` | KJ |
| `{{ etiqueta.valor_energetico_vd }}` | %VD energía |
| `{{ etiqueta.carbohidratos_g }}` | Carbohidratos (g) |
| `{{ etiqueta.carbohidratos_vd }}` | %VD carbohidratos |
| `{{ etiqueta.proteinas_g }}` | Proteínas (g) |
| `{{ etiqueta.proteinas_vd }}` | %VD proteínas |
| `{{ etiqueta.grasas_totales_g }}` | Grasas totales (g) |
| `{{ etiqueta.grasas_totales_vd }}` | %VD grasas totales |
| `{{ etiqueta.grasas_saturadas_g }}` | Grasas saturadas (g) |
| `{{ etiqueta.grasas_saturadas_vd }}` | %VD grasas saturadas |
| `{{ etiqueta.grasas_trans_g }}` | Grasas trans (g) |
| `{{ etiqueta.fibra_alimentaria_g }}` | Fibra alimentaria (g) |
| `{{ etiqueta.fibra_alimentaria_vd }}` | %VD fibra |
| `{{ etiqueta.sodio_mg }}` | Sodio (mg) |
| `{{ etiqueta.sodio_vd }}` | %VD sodio |
| `{{ etiqueta.ingredientes }}` | Texto de ingredientes |
| `{{ etiqueta.conservacion }}` | Instrucciones de conservación |
| `{{ etiqueta.elaborado_por }}` | Elaborado por |
| `{{ etiqueta.para_establecimiento }}` | Para establecimiento |
| `{{ etiqueta.codigo_ep }}` | Código EP |
| `{{ etiqueta.codigo_hm }}` | Código HM |
| `{{ fecha_elaboracion }}` | **Dinámico** — ingresado al imprimir |
| `{{ nro_lote }}` | **Dinámico** — ingresado al imprimir |
| `{{ cantidad_copias }}` | **Dinámico** — se inyecta en `^PQ` del ZPL |

---

## Archivos Nuevos / Modificados — Resumen

| Archivo | Acción |
|---|---|
| `backend/models/producto.py` | MODIFY — agrega clase `ProductoEtiqueta` |
| `backend/models/plantilla.py` | MODIFY — agrega campo `codigo_zpl` |
| `backend/schemas/producto_etiqueta.py` | **NEW** |
| `backend/crud/producto_etiqueta.py` | **NEW** |
| `backend/routers/producto_etiqueta.py` | **NEW** |
| `backend/routers/qz.py` | **NEW** |
| `backend/main.py` | MODIFY — imports, routers, lifespan inyección plantilla |
| `frontend/src/pages/Productos.jsx` | MODIFY — botón + modal etiqueta + QZ |
| `frontend/src/pages/PlantillasDocumentos.jsx` | MODIFY — soporte tipo `ETIQUETA_ZPL` |
| `frontend/index.html` | MODIFY — script QZ Tray CDN |
| `frontend/package.json` | MODIFY — agregar `nunjucks` |

---

## Verification Plan

### Backend
1. `docker-compose up --build` → confirmar que la tabla `producto_etiquetas` y columna `codigo_zpl` se crean sin errores.
2. Swagger (`http://localhost:8000/docs`) → probar `PUT /api/productos/1/etiqueta` y `GET /api/productos/1/etiqueta`.
3. `GET /api/qz/certificate` → devuelve el contenido del certificado.
4. `POST /api/qz/sign` → devuelve firma válida.

### Frontend
1. Abrir Productos → verificar que aparece el ícono `Printer` en cada fila.
2. Hacer clic → verificar que el modal abre con Tab 1 (formulario) y Tab 2 (impresión).
3. Guardar datos de etiqueta → verificar que el `PUT` llega al backend correctamente.
4. Con QZ Tray corriendo en la PC conectada a la **ZT230**: abrir Tab 2, verificar estado de conexión, ingresar lote y fecha, y enviar a la Zebra.
5. Abrir Plantillas Documentos → verificar que la plantilla `ETIQUETA_ZPL` es editable y que el glosario de variables aparece.

### Zebra ZT230 — Checklist de Hardware
- [ ] Driver ZT230 instalado en Windows (`ZDesigner ZT230-203dpi ZPL`).
- [ ] QZ Tray instalado y corriendo (ícono en bandeja del sistema).
- [ ] Certificado QZ Tray generado e importado al backend (`digital-certificate.txt` + `private-key.pem`).
- [ ] Etiqueta de 95×95 mm cargada en la impresora.
- [ ] Ribbon instalado (si se usa transferencia térmica) o etiqueta de térmica directa.
- [ ] Calibración de etiqueta realizada (`^XA^MFN,N^XZ` o botón de calibración física).
