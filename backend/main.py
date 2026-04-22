from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, get_db
from models.user import Base, User, Menu
from core.security import get_password_hash
from routers import auth, users, tipo_resp, tipo_doc, lista_precio, vendedor, cliente, punto_venta, categoria, tasa_iva, producto, empresa, cotizacion, plantilla, proveedor, zona
import models.tipo_resp
import models.tipo_doc
import models.lista_precio
import models.vendedor
import models.cliente
import models.punto_venta
import models.categoria
import models.tasa_iva
import models.producto
import models.empresa
import models.cotizacion
import models.plantilla
import models.proveedor
import models.zona

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Se ejecuta al iniciar: Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    
    # Inyectar menús de prueba si no existen
    db = next(get_db())
    if db.query(Menu).count() == 0:
        # Menús Raíz
        m_admin = Menu(nombre="Panel Admin", icono="ShieldAlert", orden=1)
        m_archivos = Menu(nombre="Archivos", icono="Folder", orden=2)
        m_ventas = Menu(nombre="Ventas", icono="ShoppingCart", orden=3)
        
        db.add_all([m_admin, m_archivos, m_ventas])
        db.commit()
        db.refresh(m_admin)
        db.refresh(m_archivos)
        
        # Submenús
        m_users = Menu(nombre="Gestión Usuarios", ruta="/usuarios", icono="Users", parent_id=m_admin.id, orden=1)
        m_config = Menu(nombre="Mi Empresa (Identidad)", ruta="/config/empresa", icono="Building2", parent_id=m_admin.id, orden=2)
        m_clientes = Menu(nombre="Clientes", ruta="/clientes", icono="UserCheck", parent_id=m_archivos.id, orden=1)
        m_productos = Menu(nombre="Productos", ruta="/productos", icono="Package", parent_id=m_archivos.id, orden=2)
        m_cotizaciones = Menu(nombre="Cotizaciones", ruta="/cotizaciones", icono="FileSpreadsheet", parent_id=m_ventas.id, orden=1)
        m_pos = Menu(nombre="Punto de Venta", ruta="/pos", icono="CreditCard", parent_id=m_ventas.id, orden=2)
        m_plantillas = Menu(nombre="Plantillas PDF", ruta="/plantillas", icono="Code2", parent_id=m_admin.id, orden=3)
        
        db.add_all([m_users, m_config, m_plantillas, m_clientes, m_productos, m_pos, m_cotizaciones])
        db.commit()
    
    # Inyectar Semilla Empresa si tabla vacía
    if db.query(models.empresa.Empresa).count() == 0:
        # Busca el ID de "Responsable Inscripto" o fallback 1 
        tr_ri = db.query(models.tipo_resp.TipoResp).filter(models.tipo_resp.TipoResp.abreviatura == "RI").first()
        ri_id = tr_ri.id if tr_ri else 1
        import datetime
        emp = models.empresa.Empresa(
            id=1,
            razon_social="Insertar Razón Social S.R.L",
            nombre_fantasia="Mi Negocio",
            cuit="30-00000000-0",
            ingresos_brutos="901-000000-1",
            fecha_inicio_actividades=datetime.date.today(),
            tipo_resp_id=ri_id,
            domicilio_comercial="Av. Principal 1234, CABA",
            provincia="Buenos Aires",
            localidad="CABA",
            telefono="011-4000-0000",
            email="contacto@minegocio.com",
            sitio_web="www.minegocio.com"
        )
        db.add(emp)
        db.commit()
        
    # Inyectar Semilla Tipos de Responsable si tabla vacía
    if db.query(models.tipo_resp.TipoResp).count() == 0:
        db.add_all([
            models.tipo_resp.TipoResp(nombre="IVA Responsable Inscripto", abreviatura="RI", codigo_arca="01"),
            models.tipo_resp.TipoResp(nombre="IVA Sujeto Exento", abreviatura="EX", codigo_arca="04"),
            models.tipo_resp.TipoResp(nombre="Consumidor Final", abreviatura="CF", codigo_arca="05"),
            models.tipo_resp.TipoResp(nombre="Responsable Monotributo", abreviatura="MT", codigo_arca="06"),
        ])
        db.commit()

    # Inyectar Menú Dinámico Tipos de Responsable si no existe
    m_tipo_resp_exist = db.query(Menu).filter(Menu.ruta == "/archivos/tipos-resp").first()
    if not m_tipo_resp_exist:
        parent = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if parent:
            m_tipo_resp = Menu(nombre="Tipos de Resp.", ruta="/archivos/tipos-resp", icono="ReceiptText", parent_id=parent.id, orden=3)
            db.add(m_tipo_resp)
            db.commit()
            
    # Inyectar Semilla Tipos de Documento si tabla vacía
    if db.query(models.tipo_doc.TipoDoc).count() == 0:
        db.add_all([
            models.tipo_doc.TipoDoc(nombre="DNI", abreviatura="DNI", codigo_arca="96"),
            models.tipo_doc.TipoDoc(nombre="CUIT", abreviatura="CUIT", codigo_arca="80"),
            models.tipo_doc.TipoDoc(nombre="CUIL", abreviatura="CUIL", codigo_arca="86"),
            models.tipo_doc.TipoDoc(nombre="Pasaporte", abreviatura="PAS", codigo_arca="94"),
        ])
        db.commit()

    # Inyectar Menú Dinámico Tipos de Documento si no existe
    m_tipo_doc_exist = db.query(Menu).filter(Menu.ruta == "/archivos/tipos-doc").first()
    if not m_tipo_doc_exist:
        parent = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if parent:
            m_tipo_doc = Menu(nombre="Tipos de Doc.", ruta="/archivos/tipos-doc", icono="FileSignature", parent_id=parent.id, orden=4)
            db.add(m_tipo_doc)
            db.commit()

    # Inyectar Semilla de Listas de Precios si tabla vacía
    if db.query(models.lista_precio.ListaPrecio).count() == 0:
        db.add_all([
            models.lista_precio.ListaPrecio(nombre="Minorista", porcentaje_ganancia=45.0),
            models.lista_precio.ListaPrecio(nombre="Mayorista", porcentaje_ganancia=25.0),
        ])
        db.commit()

    # Inyectar Menú Dinámico Listas de Precios si no existe
    m_lista_precio_exist = db.query(Menu).filter(Menu.ruta == "/archivos/listas-precios").first()
    if not m_lista_precio_exist:
        parent = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if parent:
            m_lista_precio = Menu(nombre="Listas de Precios", ruta="/archivos/listas-precios", icono="Tags", parent_id=parent.id, orden=5)
            db.add(m_lista_precio)
            db.commit()

    # Inyectar Semilla Vendedores
    if db.query(models.vendedor.Vendedor).count() == 0:
        db.add_all([
            models.vendedor.Vendedor(nombre="Juan", apellido="Pérez", porcentaje_comision=5.0),
            models.vendedor.Vendedor(nombre="María", apellido="Gómez", porcentaje_comision=3.0)
        ])
        db.commit()

    # Inyectar Menú Dinámico Vendedores si no existe
    m_vendedores_exist = db.query(Menu).filter(Menu.ruta == "/archivos/vendedores").first()
    if not m_vendedores_exist:
        parent = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if parent:
            m_vendedores = Menu(nombre="Vendedores", ruta="/archivos/vendedores", icono="Contact2", parent_id=parent.id, orden=6)
            db.add(m_vendedores)
            db.commit()

    # Mudar Clientes a Ventas si está en Archivos (Reorganización de UI Pactada)
    m_clientes_update = db.query(Menu).filter(Menu.nombre == "Clientes").first()
    m_ventas_update = db.query(Menu).filter(Menu.nombre == "Ventas").first()
    if m_clientes_update and m_ventas_update and m_clientes_update.parent_id != m_ventas_update.id:
        m_clientes_update.parent_id = m_ventas_update.id
        m_clientes_update.orden = 3 # POS=2, Coti=1
        db.commit()

    # Semilla Plantilla HTML de Cotización Si no Existe
    if db.query(models.plantilla.PlantillaDocumento).count() == 0:
        html_base = """
        <html>
        <head>
          <style>
             body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; }
             .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
             .logo { max-width: 150px; max-height: 80px; }
             .empresa-datos { text-align: left; font-size: 11px; color: #555; margin-left: 20px; }
             .title-box { text-align: right; }
             .title-box h1 { margin: 0; color: #111; font-size: 24px; }
             .cliente-box { margin-top: 20px; padding: 15px; border: 1px solid #ddd; background: #fafafa; border-radius: 5px; }
             table.items { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 11px; }
             table.items th { background-color: #222; color: #fff; padding: 10px; text-align: left; }
             table.items td { border-bottom: 1px solid #eee; padding: 10px; }
             .totals { margin-top: 30px; width: 40%; float: right; border-top: 2px solid #333; padding-top: 10px; text-align: right; }
             .totals div { margin-bottom: 5px; font-size: 13px; }
             .totals .gran-total { font-size: 18px; font-weight: bold; color: #000; }
          </style>
        </head>
        <body>
           <div class="header">
              <table style="width: 100%;"><tr>
                 <td style="width:50%; vertical-align: top;">
                    {% if empresa.logo_base64 %}
                      <img class="logo" src="{{ empresa.logo_base64 }}" />
                    {% endif %}
                    <div class="empresa-datos">
                       <strong>{{ empresa.razon_social }}</strong><br>
                       CUIT: {{ empresa.cuit or '-' }}<br>
                       Dir: {{ empresa.domicilio_comercial or '-' }}<br>
                       Tel: {{ empresa.telefono or '-' }}<br>
                    </div>
                 </td>
                 <td style="width:50%; vertical-align: top;" class="title-box">
                    <h1>COTIZACIÓN</h1>
                    <strong>Nº {{ "%04d" | format(cotizacion.punto_venta.numero) }}-{{ "%08d" | format(cotizacion.numero_comprobante) }}</strong><br>
                    Fecha: {{ cotizacion.fecha_emision.strftime('%d/%m/%Y') }}
                 </td>
              </tr></table>
           </div>
           
           <div class="cliente-box">
              <strong>Señor/es: {{ cliente.razon_social }}</strong><br>
              Documento: {{ cliente.documento }} ({{ cliente.tipo_resp.nombre if cliente.tipo_resp else '' }})<br>
              Domicilio: {{ cliente.direccion or '-' }}, {{ cliente.localidad or '' }}
           </div>
           
           <table class="items">
              <thead>
                 <tr>
                    <th>Cant.</th>
                    <th>Descripción</th>
                    <th style="text-align: right;">Unitario</th>
                    <th style="text-align: right;">Subtotal</th>
                 </tr>
              </thead>
              <tbody>
                 {% for det in detalles %}
                 <tr>
                    <td>{{ "%.2f"|format(det.cantidad) }}</td>
                    <td>{{ det.descripcion }}</td>
                    <td style="text-align: right;">$ {{ "%.2f"|format(det.precio_unitario) }}</td>
                    <td style="text-align: right;">$ {{ "%.2f"|format(det.subtotal) }}</td>
                 </tr>
                 {% endfor %}
              </tbody>
           </table>
           
           <div class="totals">
              <div>Subtotal: $ {{ "%.2f"|format(cotizacion.subtotal) }}</div>
              <div>Descuentos: $ {{ "%.2f"|format(cotizacion.descuento_monto) }}</div>
              <div class="gran-total">Total: $ {{ "%.2f"|format(cotizacion.total) }}</div>
           </div>
           <div style="clear: both;"></div>
           
           <div style="margin-top: 50px; font-size: 10px; color: #777; text-align: center;">
              Documento no válido como factura. Validez 15 días.<br>
              <i>Generado por Factu ERP Avanzado v2.0</i>
           </div>
        </body>
        </html>
        """
        p_coti = models.plantilla.PlantillaDocumento(nombre="Diseño Estándar", tipo_documento="COTIZACION", codigo_html=html_base, activa=True)
        db.add(p_coti)
        db.commit()

    # Inyección Dinámica Menú Plantillas si no existe
    m_plantillas_exist = db.query(Menu).filter(Menu.ruta == "/plantillas").first()
    if not m_plantillas_exist:
        parent = db.query(Menu).filter(Menu.nombre == "Panel Admin").first()
        if parent:
            m_plantillas = Menu(nombre="Plantillas PDF", ruta="/plantillas", icono="Code2", parent_id=parent.id, orden=3)
            db.add(m_plantillas)
            db.commit()

    # Inyección Dinámica Módulo Compras y Proveedores
    m_compras_exist = db.query(Menu).filter(Menu.nombre == "Compras").first()
    if not m_compras_exist:
        m_compras = Menu(nombre="Compras", icono="ShoppingCart", orden=4)
        db.add(m_compras)
        db.commit()
        db.refresh(m_compras)
        m_compras_exist = m_compras

    m_prov_exist = db.query(Menu).filter(Menu.ruta == "/proveedores").first()
    if not m_prov_exist:
        m_prov = Menu(nombre="Proveedores", ruta="/proveedores", icono="Truck", parent_id=m_compras_exist.id, orden=1)
        db.add(m_prov)
        db.commit()
        
    # Auto-asignar a administradores si no lo tienen
    admins = db.query(User).filter(User.is_admin == True).all()
    for admin in admins:
        admin_menus = [m.id for m in admin.menus]
        added = False
        if m_compras_exist.id not in admin_menus:
            admin.menus.append(m_compras_exist)
            added = True
        if m_prov_exist and m_prov_exist.id not in admin_menus:
            admin.menus.append(m_prov_exist)
            added = True
        elif not m_prov_exist:
            # Pudo haber existido antes, lo busco de nuevo para asignar
            m_p = db.query(Menu).filter(Menu.ruta == "/proveedores").first()
            if m_p and m_p.id not in admin_menus:
                admin.menus.append(m_p)
                added = True
        if added:
            db.commit()

    if db.query(models.punto_venta.PuntoVenta).count() == 0:
        pv_inicial = models.punto_venta.PuntoVenta(numero=1, descripcion="Local - Casa Central", facturacion_electronica=True)
        db.add(pv_inicial)
        db.commit()

    # Menú de Puntos de Venta anidado en Panel Admin
    m_pv_exist = db.query(Menu).filter(Menu.ruta == "/puntos-venta").first()
    if not m_pv_exist:
        m_admin_ref = db.query(Menu).filter(Menu.nombre == "Panel Admin").first()
        if m_admin_ref:
            m_pv = Menu(nombre="Puntos de Venta", ruta="/puntos-venta", icono="MonitorSmartphone", parent_id=m_admin_ref.id, orden=3)
            db.add(m_pv)
            db.commit()

    # Semilla Tasas IVA
    if db.query(models.tasa_iva.TasaIva).count() == 0:
        db.add_all([
            models.tasa_iva.TasaIva(nombre="IVA General 21%", valor=21.0, codigo_arca="5"),
            models.tasa_iva.TasaIva(nombre="IVA Reducido 10.5%", valor=10.5, codigo_arca="4"),
            models.tasa_iva.TasaIva(nombre="Operación Exenta", valor=0.0, codigo_arca="3")
        ])
        db.commit()

    # Menú Tasas de IVA (en Panel Admin, restringido a Jefes)
    m_iva_exist = db.query(Menu).filter(Menu.ruta == "/tasas-iva").first()
    if not m_iva_exist:
        m_admin_ref = db.query(Menu).filter(Menu.nombre == "Panel Admin").first()
        if m_admin_ref:
            m_iva = Menu(nombre="Tasas impositivas (IVA)", ruta="/tasas-iva", icono="Landmark", parent_id=m_admin_ref.id, orden=4)
            db.add(m_iva)
            db.commit()

    # Semilla Categorias
    if db.query(models.categoria.Categoria).count() == 0:
        cat_inicial = models.categoria.Categoria(nombre="Mercadería General", descripcion="Surtidos sin catalogar")
        db.add(cat_inicial)
        db.commit()

    # Menú Categorías en Archivos Operativos
    m_cat_exist = db.query(Menu).filter(Menu.ruta == "/archivos/categorias").first()
    if not m_cat_exist:
        m_archivos_ref = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if m_archivos_ref:
            m_cat = Menu(nombre="Rubros / Categorías", ruta="/archivos/categorias", icono="Boxes", parent_id=m_archivos_ref.id, orden=7)
            db.add(m_cat)
            db.commit()

    # Inyectar Menú Dinámico Zonas si no existe
    m_zonas_exist = db.query(Menu).filter(Menu.ruta == "/archivos/zonas").first()
    if not m_zonas_exist:
        parent = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if parent:
            m_zonas = Menu(nombre="Zonas de Entrega", ruta="/archivos/zonas", icono="MapPin", parent_id=parent.id, orden=8)
            db.add(m_zonas)
            db.commit()
    
    # Inyectar usuario inicial
    admin_email = "jnegrete@gmail.com"
    existing_user = db.query(User).filter(User.email == admin_email).first()
    if not existing_user:
        hashed_pwd = get_password_hash("Medrano3711")
        all_menus = db.query(Menu).all()
        new_admin = User(email=admin_email, hashed_password=hashed_pwd, nombre="Administrador Jefe", is_admin=True, menus=all_menus)
        db.add(new_admin)
        db.commit()
    else:
        # Re-asignar todos los menús al admin si ya existe para asegurar acceso total tras update
        all_menus = db.query(Menu).all()
        existing_user.menus = all_menus
        existing_user.is_admin = True
        db.commit()
        
    db.close()
    
    yield

app = FastAPI(title="Sistema Backend API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tipo_resp.router)
app.include_router(tipo_doc.router)
app.include_router(lista_precio.router)
app.include_router(vendedor.router)
app.include_router(cliente.router)
app.include_router(punto_venta.router)
app.include_router(categoria.router)
app.include_router(tasa_iva.router)
app.include_router(producto.router)
app.include_router(empresa.router)
app.include_router(cotizacion.router)
app.include_router(plantilla.router)
app.include_router(proveedor.router)
app.include_router(zona.router)
