# Factu ERP Avanzado

Sistema de Gestión Integral (ERP) moderno diseñado para la administración de pequeñas y medianas empresas. El sistema permite gestionar todo el ciclo de ventas, compras, stock y administración de usuarios con una interfaz rápida y amigable.

## 🚀 Tecnologías Principales

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Seguridad:** JWT (JSON Web Tokens) con Passlib y Bcrypt.
- **Reportes:** [WeasyPrint](https://weasyprint.org/) y [Jinja2](https://jinja.palletsprojects.com/) para generación dinámica de PDFs.

### Frontend
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Navegación:** [React Router 7](https://reactrouter.com/)

## 📦 Estructura del Proyecto

```text
factu_new/
├── backend/            # API REST (FastAPI)
│   ├── core/           # Configuración de seguridad y entorno
│   ├── crud/           # Lógica de persistencia de datos
│   ├── models/         # Modelos de base de datos (SQLAlchemy)
│   ├── routers/        # Endpoints de la API
│   ├── schemas/        # Esquemas de validación (Pydantic)
│   └── main.py         # Punto de entrada de la aplicación
├── frontend/           # Interfaz de Usuario (React + Vite)
│   ├── src/            # Código fuente (Componentes, Hooks, Contexts)
│   └── public/         # Activos estáticos
├── migrate/            # Scripts de migración y datos semilla
├── docker-compose.yml  # Configuración de Docker para desarrollo
└── README.md           # Esta documentación
```

## 🛠️ Desarrollo y Extensión

### Importación de Modelos (Crítico)
Para asegurar que las tablas de la base de datos se creen automáticamente al iniciar la aplicación (`lifespan`), es **obligatorio** importar cada nuevo modelo en `backend/main.py`. 

Ejemplo:
```python
import models.nuevo_modulo
```
Sin esta importación, SQLAlchemy no reconocerá la clase como parte de la metadata y la tabla no será generada en PostgreSQL.

### Estándares de UX y Carga de Datos
El sistema sigue un estándar estricto para la carga rápida de datos mediante teclado, el cual debe mantenerse en nuevos módulos:

- **Atajos de Teclado**:
    - `INS` (Insert): Agrega un nuevo renglón en las grillas de edición.
    - `F2`: Abre el modal de búsqueda avanzada sobre el campo activo.
- **Búsqueda Avanzada (Modal)**:
    - **Filtrado por Tokens**: La búsqueda divide las palabras escritas por espacios y coincide con cualquier parte de los registros (ej. "torn acer" buscará tornillos de acero).
    - **Navegación**: Selección de registros mediante flechas del teclado.
    - **Confirmación**: La tecla `Enter` selecciona el registro, cierra el modal y actualiza automáticamente el renglón correspondiente.

- **Estética y Minimalismo**: Evitar leyendas redundantes o innecesarias. La interfaz debe ser limpia, con botones y etiquetas profesionales y directos.

Cualquier nueva implementación de búsqueda de entidades (productos, clientes, etc.) debe reutilizar estos componentes y lógica.

### Sistema de Menús Dinámicos
El sistema utiliza una arquitectura de menús dinámicos gestionados desde la base de datos (`tabla: menus`):

- **Configuración**: Cada entrada de menú define su nombre, icono (nombre de Lucide React), ruta de frontend, orden de visualización y relación jerárquica (`parent_id`).
- **Persistencia y Permisos**: Los menús están vinculados a los usuarios. El sidebar de la aplicación se construye dinámicamente consultando los menús asignados al usuario autenticado.
- **Inyección Automática**: Al iniciar la aplicación, el sistema verifica si la tabla de menús está vacía e inyecta automáticamente los módulos base (Admin, Archivos, Ventas, Stock, etc.) para asegurar la operatividad inicial.

Para agregar un nuevo módulo al menú, se debe realizar mediante un script de migración o inyección en el bloque `lifespan` de `main.py`.

### Impresión de Etiquetas y QZ Tray (Hardware)
Para la integración con impresoras Zebra de etiquetas (ej. Zebra ZT230 a 203 dpi), el sistema implementa la librería **QZ Tray** para enviar comandos **ZPL II** nativos directamente al puerto físico (USB/Ethernet) sin requerir descargas de archivos o PDFs intermediarios.

1. **Configuración de Seguridad:**
   - La clave privada (`private-key.pem`) y el certificado público (`digital-certificate.txt`) deben ubicarse en la raíz del backend.
   - El backend expone `/api/qz/certificate` para servir el certificado, y `/api/qz/sign` para firmar digitalmente la sesión iniciada por el cliente web de QZ Tray de forma segura.

2. **Plantillas ZPL:**
   - Las etiquetas se diseñan usando lenguaje ZPL II estándar combinando variables estilo Jinja2/Nunjucks (ej. `{{ producto.nombre }}`, `{{ etiqueta.senasa_nro }}`).
   - La resolución predeterminada está configurada en **203 dpi** para etiquetas de **95 × 95 mm** (760 × 760 dots).

3. **Operación de Impresión:**
   - Al imprimir en el frontend, se cargan los datos del producto y su etiqueta, se renderiza la plantilla usando Nunjucks en local, y se envía el texto crudo ZPL a la impresora seleccionada en la configuración de la PC cliente (driver sugerido: `ZDesigner ZT230-203dpi ZPL`).

## ✨ Características Principales

### 🛒 Ventas
- **Cotizaciones:** Generación de presupuestos con exportación a PDF personalizada.
- **Punto de Venta (POS):** Interfaz ágil para facturación rápida.
- **Pedidos:** Seguimiento de pedidos de clientes y validación de stock comprometido.
- **Remitos:** Gestión de entregas de mercadería con trazabilidad completa. Permite la carga manual o automática desde Pedidos (importando saldos pendientes), actualización dinámica del estado del pedido (Parcial/Completado), control opcional de stock físico e **impresión de comprobantes en PDF**. Soporta numeración correlativa legal por Punto de Venta.

### 📦 Gestión de Inventario (Stock)
- **Ajustes de Stock:** Movimientos de entrada y salida manuales. Estos son los **únicos** registros que afectan la tabla `stk_mov`.
- **Control de Productos:** Categorización por rubros, gestión de tasas de IVA y múltiples listas de precios.
- **Ingreso por Scanner**: Interfaz optimizada para tablets y colectores de datos que permite procesar la entrada de mercadería contra remitos de compra mediante la lectura del ID (código de barras), agrupando los artículos por familia. El sistema soporta un formato delimitado simple para capturar trazabilidad: `ID|LOTE` (ej. `45|20240511-001`).
- **Impresión de Etiquetas Zebra (QZ Tray):** Integración nativa con hardware de impresión Zebra (especialmente calibrado para **Zebra ZT230** a 203 dpi) utilizando **QZ Tray** y lenguaje **ZPL II**.
  - **Datos Bromatológicos/Fiscales:** Asignación 1-a-1 de información nutricional detallada (porción, calorías, macronutrientes), números de registro (SENASA, RNPA) y textos de conservación o ingredientes por producto.
  - **Plantillas Dinámicas ZPL:** Administración de formatos de etiqueta desde el editor de plantillas integrado del sistema mediante plantillas Jinja2/ZPL editables (`ETIQUETA_ZPL`).
  - **Renderizado del Cliente:** Uso de Nunjucks.js en el frontend para inyectar variables dinámicas de impresión en tiempo real (fecha de elaboración, lote, copias) sin necesidad de procesar los datos en el backend.
  - **Firma Digital Segura:** Conexión segura autenticada mediante endpoints dedicados en el backend (`/api/qz/certificate` y `/api/qz/sign`) que proveen y firman los tokens con la clave privada de QZ Tray.
- **Regla de Oro de Stock**: Los Remitos (Venta/Compra) afectan directamente el campo `stock_actual` de la tabla `productos` si así se indica, pero **no deben generar registros en `stk_mov`**. Dicha tabla es exclusiva para auditoría de ajustes manuales.

### 🤝 Compras y Proveedores
- **Proveedores:** Maestro de proveedores y seguimiento de compras.
- **Remitos de Compra:** Registro de ingreso de mercadería. A diferencia de ventas, el número de remito es manual (formato del proveedor) y no depende de puntos de venta internos. Soporta el control de stock directo.

### 🚚 Logística
- **Gestión de Transportes:** Maestro de transportistas con soporte para códigos externos e identidad fiscal.
- **Asignación de Cargas:** Interfaz para la oficina de logística donde se seleccionan remitos pendientes y se asignan a un transporte específico.
- **Control de Despacho:** Flujo para operarios en planta que permite validar la carga consolidada por familias mediante escaneo de ID, asegurando que lo que sale coincida con lo planificado.

### 🛠️ Administración
- **Identidad de Empresa:** Configuración de razón social, CUIT, logo y datos fiscales.
- **Plantillas PDF:** Editor de plantillas HTML/Jinja2 para documentos del sistema.
- **Seguridad:** Gestión de usuarios, roles administrativos y menús dinámicos por permisos.

## 🛠️ Instalación y Configuración

### Requisitos Previos
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Pasos para Ejecutar

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd factu_new
   ```

2. **Configurar variables de entorno:**
   Copia el archivo de ejemplo y ajusta las credenciales si es necesario:
   ```bash
   cp .env.example .env
   ```

3. **Iniciar con Docker Compose:**
   ```bash
   docker-compose up --build -d
   ```

4. **Acceder a la aplicación:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Documentación API (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

## 👤 Autor
- **Jorge Omar Negrete**

---
Desarrollado con ❤️ para la gestión eficiente.
