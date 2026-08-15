from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, get_db
from models.user import Base, User, Menu
from core.security import get_password_hash
from routers import auth, users, tipo_resp, tipo_doc, lista_precio, vendedor, cliente, punto_venta, categoria, subfamilia, tasa_iva, producto, empresa, cotizacion, plantilla, proveedor, zona, stk_mov
import models.tipo_resp
import models.tipo_doc
import models.lista_precio
import models.vendedor
import models.cliente
import models.punto_venta
import models.categoria
import models.subfamilia
import models.tasa_iva
import models.producto
import models.empresa
import models.cotizacion
import models.plantilla
import models.proveedor
import models.zona
import models.stk_mov
import models.remito
import models.remito_compra
import models.transporte
import models.carga_preparacion
import models.orden_produccion
import models.devolucion
import models.vehiculo
import models.chofer
from routers import pedidos, remitos, remitos_compra, transporte, carga_preparacion, logistica_control, qz, producto_etiqueta
from routers import orden_produccion
from routers import devoluciones
from routers import vehiculo, chofer
from routers import vencimiento

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Se ejecuta al iniciar: Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    
    # Auto-migración: Agregar transporte_id a remitos si no existe
    from sqlalchemy import text
    db = next(get_db())
    try:
        # PostgreSQL soporta IF NOT EXISTS para columnas en versiones recientes, o podemos usar un check manual
        # Para ser seguros en todas las versiones, intentamos el alter y capturamos si ya existe o usamos el check de Postgres
        db.execute(text("ALTER TABLE remitos ADD COLUMN IF NOT EXISTS transporte_id INTEGER REFERENCES transportes(id)"))
        db.execute(text("ALTER TABLE remitos ADD COLUMN IF NOT EXISTS stock_procesado BOOLEAN DEFAULT FALSE"))
        db.execute(text("ALTER TABLE remito_compra_detalles ADD COLUMN IF NOT EXISTS cantidad_recibida FLOAT DEFAULT 0.0"))
        # Nuevos campos de vencimiento
        db.execute(text("ALTER TABLE remito_compra_detalles ADD COLUMN IF NOT EXISTS nro_lote VARCHAR"))
        db.execute(text("ALTER TABLE remito_compra_detalles ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMP"))
        # Trazabilidad en Remitos de Venta
        db.execute(text("ALTER TABLE remito_detalles ADD COLUMN IF NOT EXISTS nro_lote VARCHAR"))
        db.execute(text("ALTER TABLE remito_detalles ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMP"))
        # Trazabilidad en Preparación de Carga
        db.execute(text("ALTER TABLE carga_preparacion ADD COLUMN IF NOT EXISTS nro_lote VARCHAR"))
        # Migración para ZPL en Plantillas
        db.execute(text("ALTER TABLE plantillas_documentos ADD COLUMN IF NOT EXISTS codigo_zpl TEXT"))
        # Numerador de Devoluciones
        db.execute(text("ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS prox_devolucion INTEGER DEFAULT 1 NOT NULL"))
        # Vehículo/Chofer en Devoluciones (reemplaza a Transporte, que queda solo para registros históricos)
        db.execute(text("ALTER TABLE devoluciones ADD COLUMN IF NOT EXISTS vehiculo_id INTEGER REFERENCES vehiculos(id)"))
        db.execute(text("ALTER TABLE devoluciones ADD COLUMN IF NOT EXISTS chofer_id INTEGER REFERENCES choferes(id)"))
        # Subfamilia opcional en Productos (independiente de la Familia)
        db.execute(text("ALTER TABLE productos ADD COLUMN IF NOT EXISTS subfamilia_id INTEGER REFERENCES subfamilias(id)"))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error en migración manual: {e}")
        pass
    
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
        m_pedidos = Menu(nombre="Pedidos", ruta="/pedidos", icono="ClipboardList", parent_id=m_ventas.id, orden=3)
        m_remitos = Menu(nombre="Remitos", ruta="/remitos", icono="Truck", parent_id=m_ventas.id, orden=4)
        
        db.add_all([m_users, m_config, m_plantillas, m_clientes, m_productos, m_pos, m_cotizaciones, m_pedidos, m_remitos])
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

    # Semilla Plantillas HTML Si no Existen
    # 1. Cotización
    if db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "COTIZACION").count() == 0:
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
                    Fecha: {{ cotizacion.fecha_emision.strftime('%d/%m/%Y') if cotizacion.fecha_emision else '' }}
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
              <div class="gran-total" style="font-size: 18px; font-weight: bold;">Total: $ {{ "%.2f"|format(cotizacion.total) }}</div>
           </div>
           <div style="clear: both;"></div>
           
           <div style="margin-top: 50px; font-size: 10px; color: #777; text-align: center;">
              Documento no válido como factura. Validez 15 días.<br>
              <i>Generado por Factu ERP Avanzado v2.0</i>
           </div>
        </body>
        </html>
        """
        p_coti = models.plantilla.PlantillaDocumento(nombre="Cotización Estándar", tipo_documento="COTIZACION", codigo_html=html_base, activa=True)
        db.add(p_coti)
        db.commit()

    # 1.5 Etiqueta ZPL
    if db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "ETIQUETA_ZPL").count() == 0:
        zpl_base = """^XA
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
^CF0,20^FO30,200^FDInformación Nutricional: Porción {{ etiqueta.porcion_descripcion }}^FS
^CF0,18^FO30,230^FDValor Energético: {{ etiqueta.valor_energetico_kcal }} kcal / {{ etiqueta.valor_energetico_kj }} kj ({{ etiqueta.valor_energetico_vd }} %VD)^FS
^FO30,255^FDCarbohidratos: {{ etiqueta.carbohidratos_g }} g ({{ etiqueta.carbohidratos_vd }} %VD)^FS
^FO30,280^FDProteínas: {{ etiqueta.proteinas_g }} g ({{ etiqueta.proteinas_vd }} %VD)^FS
^FO30,305^FDGrasas Totales: {{ etiqueta.grasas_totales_g }} g ({{ etiqueta.grasas_totales_vd }} %VD)^FS
^FO30,330^FDGrasas Saturadas: {{ etiqueta.grasas_saturadas_g }} g ({{ etiqueta.grasas_saturadas_vd }} %VD)^FS
^FO30,355^FDGrasas Trans: {{ etiqueta.grasas_trans_g }} g^FS
^FO30,380^FDFibra Alimentaria: {{ etiqueta.fibra_alimentaria_g }} g ({{ etiqueta.fibra_alimentaria_vd }} %VD)^FS
^FO30,405^FDSodio: {{ etiqueta.sodio_mg }} mg ({{ etiqueta.sodio_vd }} %VD)^FS
^FO30,430^GB700,2,2^FS
^CF0,18^FO30,440^FB700,4,0,L,0^FDIngredientes: {{ etiqueta.ingredientes }}^FS
^CF0,18^FO30,520^FB700,3,0,L,0^FDConservación: {{ etiqueta.conservacion }}^FS
^FO30,720^FDElaborado por: {{ etiqueta.elaborado_por }}  Para Establecimiento: {{ etiqueta.para_establecimiento }}^FS
^FO580,700^FD{{ etiqueta.codigo_ep }}  {{ etiqueta.codigo_hm }}^FS
^PQ{{ cantidad_copias }}
^XZ"""
        p_etq = models.plantilla.PlantillaDocumento(nombre="Etiqueta Zebra ZT230 95x95", tipo_documento="ETIQUETA_ZPL", codigo_html="", codigo_zpl=zpl_base, activa=True)
        db.add(p_etq)
        db.commit()

    # 2. Remito
    p_remito_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "REMITO").first()
    
    html_remito = """
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
                <h1>REMITO</h1>
                <strong>Nº {{ "%04d" | format(remito.punto_venta.numero) }}-{{ "%08d" | format(remito.numero_comprobante) }}</strong><br>
                Fecha: {{ remito.fecha.strftime('%d/%m/%Y') if remito.fecha else '' }}
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
                <th style="width: 80px;">Cant.</th>
                <th>Descripción</th>
                <th style="text-align: right; width: 100px;">Unitario</th>
                <th style="text-align: right; width: 100px;">Subtotal</th>
             </tr>
          </thead>
          <tbody>
             {% for det in detalles %}
             <tr>
                <td>{{ "%.2f"|format(det.cantidad) }}</td>
                <td>{{ det.producto.nombre }}</td>
                <td style="text-align: right;">$ {{ "%.2f"|format(det.precio_unitario) }}</td>
                <td style="text-align: right;">$ {{ "%.2f"|format(det.subtotal) }}</td>
             </tr>
             {% endfor %}
          </tbody>
       </table>
       
       <div class="totals">
          <div class="gran-total">Total: $ {{ "%.2f"|format(remito.total) }}</div>
       </div>
       <div style="clear: both;"></div>
       
       <div style="margin-top: 50px; font-size: 10px; color: #777; text-align: center;">
          {{ remito.observaciones if remito.observaciones else '' }}<br><br>
          Documento no válido como factura.<br>
          <i>Generado por Factu ERP Avanzado v2.0</i>
       </div>
    </body>
    </html>
    """
    
    if not p_remito_exist:
        p_remito = models.plantilla.PlantillaDocumento(nombre="Remito Estándar", tipo_documento="REMITO", codigo_html=html_remito, activa=True)
        db.add(p_remito)
    else:
        # Forzar actualización de la plantilla si ya existe pero está rota
        p_remito_exist.codigo_html = html_remito

    db.commit()

    # 2b. Remito de Compra
    p_remito_compra_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "REMITO_COMPRA").first()

    html_remito_compra = """
    <html>
    <head>
      <style>
         body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; }
         .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
         .logo { max-width: 150px; max-height: 80px; }
         .empresa-datos { text-align: left; font-size: 11px; color: #555; margin-left: 20px; }
         .title-box { text-align: right; }
         .title-box h1 { margin: 0; color: #111; font-size: 24px; }
         .proveedor-box { margin-top: 20px; padding: 15px; border: 1px solid #ddd; background: #fafafa; border-radius: 5px; }
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
                <h1>REMITO DE COMPRA</h1>
                <strong>Nº {{ remito.numero_remito }}</strong><br>
                Fecha: {{ remito.fecha.strftime('%d/%m/%Y') if remito.fecha else '' }}
             </td>
          </tr></table>
       </div>

       <div class="proveedor-box">
          <strong>Proveedor: {{ proveedor.razon_social }}</strong><br>
          Documento: {{ proveedor.documento }} ({{ proveedor.tipo_resp.nombre if proveedor.tipo_resp else '' }})<br>
          Domicilio: {{ proveedor.direccion or '-' }}, {{ proveedor.localidad or '' }}
       </div>

       <table class="items">
          <thead>
             <tr>
                <th style="width: 80px;">Cant.</th>
                <th>Descripción</th>
                <th style="text-align: right; width: 100px;">Unitario</th>
                <th style="text-align: right; width: 100px;">Subtotal</th>
             </tr>
          </thead>
          <tbody>
             {% for det in detalles %}
             <tr>
                <td>{{ "%.2f"|format(det.cantidad) }}</td>
                <td>{{ det.producto.nombre }}</td>
                <td style="text-align: right;">$ {{ "%.2f"|format(det.precio_unitario) }}</td>
                <td style="text-align: right;">$ {{ "%.2f"|format(det.subtotal) }}</td>
             </tr>
             {% endfor %}
          </tbody>
       </table>

       <div class="totals">
          <div class="gran-total">Total: $ {{ "%.2f"|format(remito.total) }}</div>
       </div>
       <div style="clear: both;"></div>

       <div style="margin-top: 50px; font-size: 10px; color: #777; text-align: center;">
          {{ remito.observaciones if remito.observaciones else '' }}<br><br>
          Documento no válido como factura.<br>
          <i>Generado por Factu ERP Avanzado v2.0</i>
       </div>
    </body>
    </html>
    """

    if not p_remito_compra_exist:
        p_remito_compra = models.plantilla.PlantillaDocumento(nombre="Remito de Compra Estándar", tipo_documento="REMITO_COMPRA", codigo_html=html_remito_compra, activa=True)
        db.add(p_remito_compra)
    else:
        # Forzar actualización de la plantilla si ya existe pero está rota
        p_remito_compra_exist.codigo_html = html_remito_compra

    db.commit()

    # 2c. Reporte de Ajustes de Stock
    p_reporte_stock_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "REPORTE_AJUSTE_STOCK").first()

    html_reporte_stock = """
    <html>
    <head>
      <style>
         body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; }
         .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
         .logo { max-width: 150px; max-height: 80px; }
         .empresa-datos { text-align: left; font-size: 11px; color: #555; margin-left: 20px; }
         .title-box { text-align: right; }
         .title-box h1 { margin: 0; color: #111; font-size: 22px; }
         .filtros-box { margin-top: 20px; padding: 12px 15px; border: 1px solid #ddd; background: #fafafa; border-radius: 5px; font-size: 11px; }
         .filtros-box span { margin-right: 25px; }
         table.items { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
         table.items th { background-color: #222; color: #fff; padding: 8px; text-align: left; }
         table.items td { border-bottom: 1px solid #eee; padding: 8px; }
         .tipo-entrada { color: #15803d; font-weight: bold; }
         .tipo-salida { color: #b91c1c; font-weight: bold; }
         .footer-total { margin-top: 15px; text-align: right; font-size: 12px; font-weight: bold; }
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
                </div>
             </td>
             <td style="width:50%; vertical-align: top;" class="title-box">
                <h1>REPORTE DE AJUSTES DE STOCK</h1>
                Generado: {{ fecha_generacion.strftime('%d/%m/%Y %H:%M') if fecha_generacion else '' }}
             </td>
          </tr></table>
       </div>

       <div class="filtros-box">
          <span><strong>Tipo:</strong> {{ filtros.tipo_label }}</span>
          <span><strong>Desde:</strong> {{ filtros.fecha_desde.strftime('%d/%m/%Y') if filtros.fecha_desde else '-' }}</span>
          <span><strong>Hasta:</strong> {{ filtros.fecha_hasta.strftime('%d/%m/%Y') if filtros.fecha_hasta else '-' }}</span>
          <span><strong>Producto:</strong> {{ filtros.producto_label }}</span>
       </div>

       <table class="items">
          <thead>
             <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Código</th>
                <th>Descripción</th>
                <th>Motivo</th>
                <th style="text-align: right;">Cantidad</th>
                <th>Usuario</th>
             </tr>
          </thead>
          <tbody>
             {% for mov in movimientos %}
             <tr>
                <td>{{ mov.fecha_hora.strftime('%d/%m/%Y %H:%M') if mov.fecha_hora else '' }}</td>
                <td class="{{ 'tipo-entrada' if mov.tipo == 1 else 'tipo-salida' }}">{{ 'Entrada' if mov.tipo == 1 else 'Salida' }}</td>
                <td>{{ mov.producto.codigo_interno if mov.producto else '' }}</td>
                <td>{{ mov.producto.nombre if mov.producto else '' }}</td>
                <td>{{ mov.motivo }}</td>
                <td style="text-align: right;">{{ "%.2f"|format(mov.cantidad) }}</td>
                <td>{{ (mov.usuario.nombre or mov.usuario.email) if mov.usuario else '' }}</td>
             </tr>
             {% endfor %}
          </tbody>
       </table>

       <div class="footer-total">Total de movimientos: {{ total }}</div>
    </body>
    </html>
    """

    if not p_reporte_stock_exist:
        p_reporte_stock = models.plantilla.PlantillaDocumento(nombre="Reporte de Ajustes de Stock", tipo_documento="REPORTE_AJUSTE_STOCK", codigo_html=html_reporte_stock, activa=True)
        db.add(p_reporte_stock)
    else:
        # Forzar actualización de la plantilla si ya existe pero está rota
        p_reporte_stock_exist.codigo_html = html_reporte_stock

    db.commit()

    # 2c-bis. Reporte de Stock Mínimo
    p_reporte_stock_min_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "REPORTE_STOCK_MINIMO").first()

    html_reporte_stock_min = """
    <html>
    <head>
      <style>
         body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; }
         .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
         .logo { max-width: 150px; max-height: 80px; }
         .empresa-datos { text-align: left; font-size: 11px; color: #555; margin-left: 20px; }
         .title-box { text-align: right; }
         .title-box h1 { margin: 0; color: #111; font-size: 22px; }
         .filtros-box { margin-top: 20px; padding: 12px 15px; border: 1px solid #ddd; background: #fafafa; border-radius: 5px; font-size: 11px; }
         .filtros-box span { margin-right: 25px; }
         table.items { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
         table.items th { background-color: #222; color: #fff; padding: 8px; text-align: left; }
         table.items td { border-bottom: 1px solid #eee; padding: 8px; }
         .stock-bajo { color: #b91c1c; font-weight: bold; }
         .footer-total { margin-top: 15px; text-align: right; font-size: 12px; font-weight: bold; }
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
                </div>
             </td>
             <td style="width:50%; vertical-align: top;" class="title-box">
                <h1>REPORTE DE STOCK MÍNIMO</h1>
                Generado: {{ fecha_generacion.strftime('%d/%m/%Y %H:%M') if fecha_generacion else '' }}
             </td>
          </tr></table>
       </div>

       <div class="filtros-box">
          <span><strong>Familia:</strong> {{ filtros.familia_label }}</span>
          <span><strong>Subfamilia:</strong> {{ filtros.subfamilia_label }}</span>
       </div>

       <table class="items">
          <thead>
             <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Familia</th>
                <th style="text-align: right;">Stock</th>
                <th style="text-align: right;">Stock Mínimo</th>
             </tr>
          </thead>
          <tbody>
             {% for prod in productos %}
             <tr>
                <td>{{ prod.codigo_interno }}</td>
                <td>{{ prod.nombre }}</td>
                <td>{{ prod.categoria.nombre if prod.categoria else '' }}</td>
                <td class="stock-bajo" style="text-align: right;">{{ "%.2f"|format(prod.stock_actual) }}</td>
                <td style="text-align: right;">{{ "%.2f"|format(prod.stock_minimo) }}</td>
             </tr>
             {% endfor %}
          </tbody>
       </table>

       <div class="footer-total">Total de productos bajo stock mínimo: {{ total }}</div>
    </body>
    </html>
    """

    if not p_reporte_stock_min_exist:
        p_reporte_stock_min = models.plantilla.PlantillaDocumento(nombre="Reporte de Stock Mínimo", tipo_documento="REPORTE_STOCK_MINIMO", codigo_html=html_reporte_stock_min, activa=True)
        db.add(p_reporte_stock_min)
    else:
        # Forzar actualización de la plantilla si ya existe pero está rota
        p_reporte_stock_min_exist.codigo_html = html_reporte_stock_min

    db.commit()

    # 2c-ter. Agenda de Vencimientos (Vehículos y Choferes)
    p_reporte_agenda_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "REPORTE_AGENDA_VENCIMIENTOS").first()

    html_reporte_agenda = """
    <html>
    <head>
      <style>
         body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; }
         .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
         .logo { max-width: 150px; max-height: 80px; }
         .empresa-datos { text-align: left; font-size: 11px; color: #555; margin-left: 20px; }
         .title-box { text-align: right; }
         .title-box h1 { margin: 0; color: #111; font-size: 22px; }
         .filtros-box { margin-top: 20px; padding: 12px 15px; border: 1px solid #ddd; background: #fafafa; border-radius: 5px; font-size: 11px; }
         .filtros-box span { margin-right: 25px; }
         table.items { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
         table.items th { background-color: #222; color: #fff; padding: 8px; text-align: left; }
         table.items td { border-bottom: 1px solid #eee; padding: 8px; }
         .estado-vencido { color: #b91c1c; font-weight: bold; }
         .estado-pendiente { color: #b45309; font-weight: bold; }
         .estado-finalizado { color: #047857; font-weight: bold; }
         .footer-total { margin-top: 15px; text-align: right; font-size: 12px; font-weight: bold; }
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
                </div>
             </td>
             <td style="width:50%; vertical-align: top;" class="title-box">
                <h1>AGENDA DE VENCIMIENTOS</h1>
                Generado: {{ fecha_generacion.strftime('%d/%m/%Y %H:%M') if fecha_generacion else '' }}
             </td>
          </tr></table>
       </div>

       <div class="filtros-box">
          <span><strong>Desde:</strong> {{ filtros.fecha_desde.strftime('%d/%m/%Y') if filtros.fecha_desde else '-' }}</span>
          <span><strong>Hasta:</strong> {{ filtros.fecha_hasta.strftime('%d/%m/%Y') if filtros.fecha_hasta else '-' }}</span>
          <span><strong>Responsable:</strong> {{ filtros.responsable_label }}</span>
          <span><strong>Tipo:</strong> {{ filtros.tipo_label }}</span>
       </div>

       <table class="items">
          <thead>
             <tr>
                <th>Tipo</th>
                <th>Vehículo / Chofer</th>
                <th>Trámite</th>
                <th>Vencimiento</th>
                <th>Responsable</th>
                <th>Estado</th>
             </tr>
          </thead>
          <tbody>
             {% for fila in filas %}
             <tr>
                <td>{{ fila.tipo_label }}</td>
                <td>{{ fila.entidad_nombre }}</td>
                <td>{{ fila.tipo_documento }}</td>
                <td>{{ fila.fecha_vencimiento.strftime('%d/%m/%Y') }}</td>
                <td>{{ fila.responsable_nombre }}</td>
                <td class="estado-{{ fila.estado|lower }}">{{ fila.estado }}</td>
             </tr>
             {% endfor %}
          </tbody>
       </table>

       <div class="footer-total">Total de vencimientos: {{ total }}</div>
    </body>
    </html>
    """

    if not p_reporte_agenda_exist:
        p_reporte_agenda = models.plantilla.PlantillaDocumento(nombre="Agenda de Vencimientos", tipo_documento="REPORTE_AGENDA_VENCIMIENTOS", codigo_html=html_reporte_agenda, activa=True)
        db.add(p_reporte_agenda)
    else:
        # Forzar actualización de la plantilla si ya existe pero está rota
        p_reporte_agenda_exist.codigo_html = html_reporte_agenda

    db.commit()

    # 2d. Devolución
    p_devolucion_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "DEVOLUCION").first()

    html_devolucion = """
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
         .motivo-box { margin-top: 15px; padding: 12px 15px; border: 1px solid #f0c36d; background: #fff8e6; border-radius: 5px; font-size: 12px; }
         table.items { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 11px; }
         table.items th { background-color: #222; color: #fff; padding: 10px; text-align: left; }
         table.items td { border-bottom: 1px solid #eee; padding: 10px; }
         .firma-box { margin-top: 70px; display: flex; justify-content: space-between; }
         .firma-item { width: 45%; text-align: center; }
         .firma-linea { border-top: 1px solid #333; margin-top: 60px; padding-top: 8px; font-size: 11px; }
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
                <h1>DEVOLUCIÓN</h1>
                <strong>Nº {{ "%04d" | format(devolucion.punto_venta.numero) }}-{{ "%08d" | format(devolucion.numero_comprobante) }}</strong><br>
                Fecha: {{ devolucion.fecha.strftime('%d/%m/%Y') if devolucion.fecha else '' }}
             </td>
          </tr></table>
       </div>

       <div class="cliente-box">
          <strong>Señor/es: {{ cliente.razon_social }}</strong><br>
          Documento: {{ cliente.documento }} ({{ cliente.tipo_resp.nombre if cliente.tipo_resp else '' }})<br>
          Domicilio: {{ cliente.direccion or '-' }}, {{ cliente.localidad or '' }}<br>
          {% if vehiculo or chofer %}
             {% if vehiculo %}Vehículo: {{ vehiculo.descripcion }}{% if vehiculo.patente %} ({{ vehiculo.patente }}){% endif %}<br>{% endif %}
             {% if chofer %}Chofer: {{ chofer.nombre }}{% endif %}
          {% elif transporte %}
             Transporte: {{ transporte.nombre }}
          {% endif %}
       </div>

       <div class="motivo-box">
          <strong>Motivo de la devolución:</strong> {{ devolucion.motivo }}
       </div>

       <table class="items">
          <thead>
             <tr>
                <th style="width: 90px;">Código</th>
                <th style="width: 80px;">Cant.</th>
                <th>Descripción</th>
                <th style="width: 140px;">Lote</th>
             </tr>
          </thead>
          <tbody>
             {% for det in detalles %}
             <tr>
                <td>{{ det.producto.codigo_interno }}</td>
                <td>{{ "%.2f"|format(det.cantidad) }}</td>
                <td>{{ det.producto.nombre }}</td>
                <td>{{ det.nro_lote or '-' }}</td>
             </tr>
             {% endfor %}
          </tbody>
       </table>

       <div style="margin-top: 20px; font-size: 10px; color: #777;">
          {{ devolucion.observaciones if devolucion.observaciones else '' }}
       </div>

       <div class="firma-box">
          <div class="firma-item">
             <div class="firma-linea">Firma Chofer</div>
          </div>
          <div class="firma-item">
             <div class="firma-linea">Aclaración / DNI</div>
          </div>
       </div>

       <div style="margin-top: 40px; font-size: 10px; color: #777; text-align: center;">
          Documento no válido como factura.<br>
          <i>Generado por Factu ERP Avanzado v2.0</i>
       </div>
    </body>
    </html>
    """

    if not p_devolucion_exist:
        p_devolucion = models.plantilla.PlantillaDocumento(nombre="Devolución Estándar", tipo_documento="DEVOLUCION", codigo_html=html_devolucion, activa=True)
        db.add(p_devolucion)
    else:
        # Forzar actualización de la plantilla si ya existe pero está rota
        p_devolucion_exist.codigo_html = html_devolucion

    db.commit()

    # 3. Orden de Producción (Parte de Trabajo) — SOLO crear si no existe (respeta ediciones del admin)
    p_op_exist = db.query(models.plantilla.PlantillaDocumento).filter(models.plantilla.PlantillaDocumento.tipo_documento == "ORDEN_PRODUCCION").first()
    if not p_op_exist:
        html_op = """
    <html>
    <head>
      <style>
         body { font-family: 'Helvetica', 'Arial', sans-serif; color: #222; font-size: 12px; }
         .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d35400; padding-bottom: 10px; }
         .empresa { font-size: 11px; color: #555; }
         .empresa strong { font-size: 13px; color: #222; }
         .doc-title { text-align: right; }
         .doc-title h1 { margin: 0; color: #d35400; font-size: 22px; letter-spacing: 1px; }
         .doc-meta { font-size: 12px; margin-top: 4px; }
         .estado { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; }
         .e-abierta { background: #fdebd0; color: #b9770e; }
         .e-cerrada { background: #d5f5e3; color: #1e8449; }
         .e-cancelada { background: #fadbd8; color: #c0392b; }
         h2.sec { margin: 22px 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 6px 8px; color: #fff; }
         h2.insumos { background: #922b21; }
         h2.productos { background: #1e8449; }
         table.grid { width: 100%; border-collapse: collapse; font-size: 12px; }
         table.grid th { background: #f2f2f2; text-align: left; padding: 8px; border: 1px solid #ccc; }
         table.grid td { padding: 8px; border: 1px solid #ddd; }
         table.grid td.cant { text-align: center; font-weight: bold; font-size: 14px; }
         .obs { margin-top: 20px; padding: 10px; border: 1px solid #ddd; background: #fafafa; font-size: 12px; }
         .merma { margin-top: 14px; text-align: right; font-size: 13px; font-weight: bold; color: #922b21; }
         .firmas { margin-top: 55px; display: flex; justify-content: space-between; }
         .firma { width: 40%; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 11px; color: #555; }
         .pie { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
       {% set cerrada = orden.estado == 'Cerrada' %}
       <div class="top">
          <div class="empresa">
             {% if empresa.logo_base64 %}<img src="{{ empresa.logo_base64 }}" style="max-height:55px; margin-bottom:5px;"><br>{% endif %}
             <strong>{{ empresa.razon_social }}</strong><br>
             {{ empresa.domicilio_comercial or '' }}{% if empresa.localidad %}, {{ empresa.localidad }}{% endif %}<br>
             Tel: {{ empresa.telefono or '-' }}
          </div>
          <div class="doc-title">
             <h1>PARTE DE PRODUCCIÓN</h1>
             <div class="doc-meta">
                Nº OP-{{ "%05d" | format(orden.numero) }}<br>
                Fecha: {{ orden.fecha.strftime('%d/%m/%Y') if orden.fecha else '' }}
                {% if cerrada and orden.fecha_cierre %}<br>Cierre: {{ orden.fecha_cierre.strftime('%d/%m/%Y %H:%M') }}{% endif %}
             </div>
             <span class="estado {% if orden.estado == 'Cerrada' %}e-cerrada{% elif orden.estado == 'Cancelada' %}e-cancelada{% else %}e-abierta{% endif %}">{{ orden.estado }}</span>
          </div>
       </div>

       <h2 class="sec insumos">Materia prima a procesar</h2>
       <table class="grid">
          <thead>
             <tr>
                <th>Producto</th>
                <th style="width:90px; text-align:center;">Cant. {% if cerrada %}real{% else %}plan.{% endif %}</th>
                <th style="width:70px;">Unidad</th>
                <th style="width:150px;">Lote origen</th>
                {% if not cerrada %}<th style="width:110px; text-align:center;">Cant. real</th>{% endif %}
             </tr>
          </thead>
          <tbody>
             {% for i in insumos %}
             <tr>
                <td>{{ i.producto.nombre }}</td>
                <td class="cant">{{ "%.2f"|format(i.cantidad_real if cerrada else i.cantidad_planificada) }}</td>
                <td>{{ i.producto.unidad }}</td>
                <td>{{ i.nro_lote or '________________' }}</td>
                {% if not cerrada %}<td></td>{% endif %}
             </tr>
             {% endfor %}
          </tbody>
       </table>

       <h2 class="sec productos">Subproductos a obtener</h2>
       <table class="grid">
          <thead>
             <tr>
                <th>Producto</th>
                <th style="width:90px; text-align:center;">Cant. {% if cerrada %}real{% else %}plan.{% endif %}</th>
                <th style="width:70px;">Unidad</th>
                <th style="width:130px;">Lote generado</th>
                <th style="width:100px;">Vencim.</th>
                {% if not cerrada %}<th style="width:110px; text-align:center;">Cant. real</th>{% endif %}
             </tr>
          </thead>
          <tbody>
             {% for p in productos %}
             <tr>
                <td>{{ p.producto.nombre }}</td>
                <td class="cant">{{ "%.2f"|format(p.cantidad_real if cerrada else p.cantidad_planificada) }}</td>
                <td>{{ p.producto.unidad }}</td>
                <td>{{ p.nro_lote_generado or '____________' }}</td>
                <td>{{ p.fecha_vencimiento.strftime('%d/%m/%Y') if p.fecha_vencimiento else '__/__/____' }}</td>
                {% if not cerrada %}<td></td>{% endif %}
             </tr>
             {% endfor %}
          </tbody>
       </table>

       {% if cerrada %}
       {% set tot_ins = insumos | sum(attribute='cantidad_real') %}
       {% set tot_prod = productos | sum(attribute='cantidad_real') %}
       <div class="merma">Merma: {{ "%.2f"|format(tot_ins - tot_prod) }} {% if tot_ins > 0 %}({{ "%.1f"|format((tot_ins - tot_prod) / tot_ins * 100) }}%){% endif %}</div>
       {% endif %}

       {% if orden.observaciones %}
       <div class="obs"><strong>Observaciones:</strong> {{ orden.observaciones }}</div>
       {% endif %}

       <div class="firmas">
          <div class="firma">Operario</div>
          <div class="firma">Responsable de producción</div>
       </div>

       <div class="pie">Parte de producción · Generado por Factu ERP Avanzado</div>
    </body>
    </html>
    """
        p_op = models.plantilla.PlantillaDocumento(nombre="Parte de Producción Estándar", tipo_documento="ORDEN_PRODUCCION", codigo_html=html_op, activa=True)
        db.add(p_op)
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

    m_remitos_compra_exist = db.query(Menu).filter(Menu.ruta == "/compras/remitos").first()
    if not m_remitos_compra_exist:
        m_remitos_compra = Menu(nombre="Remitos de Compra", ruta="/compras/remitos", icono="ClipboardCheck", parent_id=m_compras_exist.id, orden=2)
        db.add(m_remitos_compra)
        db.commit()

    # Inyección Dinámica Módulo Stock y Ajustes
    m_stock_exist = db.query(Menu).filter(Menu.nombre == "Stock").first()
    if not m_stock_exist:
        m_stock = Menu(nombre="Stock", icono="PackageOpen", orden=5)
        db.add(m_stock)
        db.commit()
        db.refresh(m_stock)
        m_stock_exist = m_stock

    m_ajuste_exist = db.query(Menu).filter(Menu.ruta == "/stock/ajustes").first()
    if not m_ajuste_exist:
        m_ajuste = Menu(nombre="Ajuste de stock", ruta="/stock/ajustes", icono="ArrowRightLeft", parent_id=m_stock_exist.id, orden=1)
        db.add(m_ajuste)
        db.commit()
        db.refresh(m_ajuste)
        m_ajuste_exist = m_ajuste

    m_ingreso_scanner_exist = db.query(Menu).filter(Menu.ruta == "/stock/ingreso-scanner").first()
    if not m_ingreso_scanner_exist:
        m_ing_scan = Menu(nombre="Ingreso por Scanner", ruta="/stock/ingreso-scanner", icono="ScanBarcode", parent_id=m_stock_exist.id, orden=2)
        db.add(m_ing_scan)
        db.commit()

    m_devoluciones_exist = db.query(Menu).filter(Menu.ruta == "/stock/devoluciones").first()
    if not m_devoluciones_exist:
        m_devoluciones = Menu(nombre="Devoluciones", ruta="/stock/devoluciones", icono="RotateCcw", parent_id=m_stock_exist.id, orden=3)
        db.add(m_devoluciones)
        db.commit()

    m_stock_minimo_exist = db.query(Menu).filter(Menu.ruta == "/stock/stock-minimo").first()
    if not m_stock_minimo_exist:
        m_stock_minimo = Menu(nombre="Stock Mínimo", ruta="/stock/stock-minimo", icono="AlertTriangle", parent_id=m_stock_exist.id, orden=4)
        db.add(m_stock_minimo)
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
        
        # Asignar menú de Stock si no lo tienen
        if m_stock_exist and m_stock_exist.id not in admin_menus:
            admin.menus.append(m_stock_exist)
            added = True
        if m_ajuste_exist and m_ajuste_exist.id not in admin_menus:
            admin.menus.append(m_ajuste_exist)
            added = True
        elif not m_ajuste_exist:
            m_a = db.query(Menu).filter(Menu.ruta == "/stock/ajustes").first()
            if m_a and m_a.id not in admin_menus:
                admin.menus.append(m_a)
                added = True
        
        m_i_s = db.query(Menu).filter(Menu.ruta == "/stock/ingreso-scanner").first()
        if m_i_s and m_i_s.id not in admin_menus:
            admin.menus.append(m_i_s)
            added = True

        m_dev = db.query(Menu).filter(Menu.ruta == "/stock/devoluciones").first()
        if m_dev and m_dev.id not in admin_menus:
            admin.menus.append(m_dev)
            added = True

        m_stk_min = db.query(Menu).filter(Menu.ruta == "/stock/stock-minimo").first()
        if m_stk_min and m_stk_min.id not in admin_menus:
            admin.menus.append(m_stk_min)
            added = True

        m_pedidos_exist = db.query(Menu).filter(Menu.ruta == "/pedidos").first()
        if not m_pedidos_exist:
            m_v_ref = db.query(Menu).filter(Menu.nombre == "Ventas").first()
            if m_v_ref:
                m_pedidos_exist = Menu(nombre="Pedidos", ruta="/pedidos", icono="ClipboardList", parent_id=m_v_ref.id, orden=3)
                db.add(m_pedidos_exist)
                db.commit()
                db.refresh(m_pedidos_exist)
        if m_pedidos_exist and m_pedidos_exist.id not in admin_menus:
            admin.menus.append(m_pedidos_exist)
            added = True

        m_remitos_exist = db.query(Menu).filter(Menu.ruta == "/remitos").first()
        if not m_remitos_exist:
            m_v_ref = db.query(Menu).filter(Menu.nombre == "Ventas").first()
            if m_v_ref:
                m_remitos_exist = Menu(nombre="Remitos", ruta="/remitos", icono="Truck", parent_id=m_v_ref.id, orden=4)
                db.add(m_remitos_exist)
                db.commit()
                db.refresh(m_remitos_exist)
        if m_remitos_exist and m_remitos_exist.id not in admin_menus:
            admin.menus.append(m_remitos_exist)
            added = True

        if added:
            db.commit()

    # Inyección Dinámica Módulo Logística
    m_logistica_exist = db.query(Menu).filter(Menu.nombre == "Logística").first()
    if not m_logistica_exist:
        m_logistica = Menu(nombre="Logística", icono="Truck", orden=6)
        db.add(m_logistica)
        db.commit()
        db.refresh(m_logistica)
        m_logistica_exist = m_logistica

    m_transporte_menu_exist = db.query(Menu).filter(Menu.ruta == "/transportes").first()
    if not m_transporte_menu_exist:
        m_transporte_menu = Menu(nombre="Transportes", ruta="/transportes", icono="Container", parent_id=m_logistica_exist.id, orden=1)
        db.add(m_transporte_menu)
        db.commit()
        db.refresh(m_transporte_menu)
        m_transporte_menu_exist = m_transporte_menu

    m_asignacion_menu_exist = db.query(Menu).filter(Menu.ruta == "/logistica/asignacion").first()
    if not m_asignacion_menu_exist:
        m_asignacion_menu = Menu(nombre="Asignación de Cargas", ruta="/logistica/asignacion", icono="ClipboardCheck", parent_id=m_logistica_exist.id, orden=2)
        db.add(m_asignacion_menu)
        db.commit()
        db.refresh(m_asignacion_menu)
        m_asignacion_menu_exist = m_asignacion_menu

    m_preparacion_menu_exist = db.query(Menu).filter(Menu.ruta == "/logistica/preparacion").first()
    if not m_preparacion_menu_exist:
        m_preparacion_menu = Menu(nombre="Preparación de Carga", ruta="/logistica/preparacion", icono="PackageCheck", parent_id=m_logistica_exist.id, orden=3)
        db.add(m_preparacion_menu)
        db.commit()
        db.refresh(m_preparacion_menu)
        m_preparacion_menu_exist = m_preparacion_menu

    m_control_menu_exist = db.query(Menu).filter(Menu.ruta == "/logistica/control").first()
    if not m_control_menu_exist:
        m_control_menu = Menu(nombre="Control de Despacho", ruta="/logistica/control", icono="ScanBarcode", parent_id=m_logistica_exist.id, orden=4)
        db.add(m_control_menu)
        db.commit()
        db.refresh(m_control_menu)
        m_control_menu_exist = m_control_menu

    m_vehiculos_menu_exist = db.query(Menu).filter(Menu.ruta == "/logistica/vehiculos").first()
    if not m_vehiculos_menu_exist:
        m_vehiculos_menu = Menu(nombre="Vehículos", ruta="/logistica/vehiculos", icono="Car", parent_id=m_logistica_exist.id, orden=5)
        db.add(m_vehiculos_menu)
        db.commit()
        db.refresh(m_vehiculos_menu)
        m_vehiculos_menu_exist = m_vehiculos_menu

    m_choferes_menu_exist = db.query(Menu).filter(Menu.ruta == "/logistica/choferes").first()
    if not m_choferes_menu_exist:
        m_choferes_menu = Menu(nombre="Choferes", ruta="/logistica/choferes", icono="IdCard", parent_id=m_logistica_exist.id, orden=6)
        db.add(m_choferes_menu)
        db.commit()
        db.refresh(m_choferes_menu)
        m_choferes_menu_exist = m_choferes_menu

    m_agenda_menu_exist = db.query(Menu).filter(Menu.ruta == "/logistica/agenda").first()
    if not m_agenda_menu_exist:
        m_agenda_menu = Menu(nombre="Agenda", ruta="/logistica/agenda", icono="CalendarDays", parent_id=m_logistica_exist.id, orden=7)
        db.add(m_agenda_menu)
        db.commit()
        db.refresh(m_agenda_menu)
        m_agenda_menu_exist = m_agenda_menu

    # Asignar a administradores
    admins = db.query(User).filter(User.is_admin == True).all()
    for admin in admins:
        admin_menus = [m.id for m in admin.menus]
        added_log = False
        if m_logistica_exist.id not in admin_menus:
            admin.menus.append(m_logistica_exist)
            added_log = True
        if m_transporte_menu_exist.id not in admin_menus:
            admin.menus.append(m_transporte_menu_exist)
            added_log = True
        if m_asignacion_menu_exist.id not in admin_menus:
            admin.menus.append(m_asignacion_menu_exist)
            added_log = True
        if m_preparacion_menu_exist.id not in admin_menus:
            admin.menus.append(m_preparacion_menu_exist)
            added_log = True
        if m_control_menu_exist.id not in admin_menus:
            admin.menus.append(m_control_menu_exist)
            added_log = True
        if m_vehiculos_menu_exist.id not in admin_menus:
            admin.menus.append(m_vehiculos_menu_exist)
            added_log = True
        if m_choferes_menu_exist.id not in admin_menus:
            admin.menus.append(m_choferes_menu_exist)
            added_log = True
        if m_agenda_menu_exist.id not in admin_menus:
            admin.menus.append(m_agenda_menu_exist)
            added_log = True
        if added_log:
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

    # Menú Subfamilias en Archivos Operativos
    m_subf_exist = db.query(Menu).filter(Menu.ruta == "/archivos/subfamilias").first()
    if not m_subf_exist:
        m_archivos_ref = db.query(Menu).filter(Menu.nombre == "Archivos").first()
        if m_archivos_ref:
            m_subf = Menu(nombre="Subfamilias", ruta="/archivos/subfamilias", icono="Layers", parent_id=m_archivos_ref.id, orden=9)
            db.add(m_subf)
            db.commit()

    # Inyectar sección Producción + Órdenes de Producción si no existe
    m_prod_exist = db.query(Menu).filter(Menu.nombre == "Producción").first()
    if not m_prod_exist:
        m_prod = Menu(nombre="Producción", icono="Factory", orden=5)
        db.add(m_prod)
        db.commit()
        m_prod_exist = m_prod
    m_op_exist = db.query(Menu).filter(Menu.ruta == "/produccion/ordenes").first()
    if not m_op_exist:
        m_op = Menu(nombre="Órdenes de Producción", ruta="/produccion/ordenes", icono="Factory", parent_id=m_prod_exist.id, orden=1)
        db.add(m_op)
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
app.include_router(subfamilia.router)
app.include_router(tasa_iva.router)
app.include_router(producto.router)
app.include_router(empresa.router)
app.include_router(cotizacion.router)
app.include_router(plantilla.router)
app.include_router(proveedor.router)
app.include_router(zona.router)
app.include_router(stk_mov.router)
app.include_router(pedidos.router)
app.include_router(remitos.router)
app.include_router(remitos_compra.router)
app.include_router(devoluciones.router)
app.include_router(qz.router)
app.include_router(transporte.router)
app.include_router(carga_preparacion.router)
app.include_router(logistica_control.router)
app.include_router(producto_etiqueta.router)
app.include_router(orden_produccion.router)
app.include_router(vehiculo.router)
app.include_router(chofer.router)
app.include_router(vencimiento.router)
