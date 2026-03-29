from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, get_db
from models.user import Base, User, Menu
from core.security import get_password_hash
from routers import auth, users, tipo_resp, tipo_doc, lista_precio, vendedor, cliente, punto_venta, categoria, tasa_iva, producto
import models.tipo_resp
import models.tipo_doc
import models.lista_precio
import models.vendedor
import models.cliente
import models.punto_venta
import models.categoria
import models.tasa_iva
import models.producto

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
        m_config = Menu(nombre="Configuraciones", ruta="/config", icono="Settings", parent_id=m_admin.id, orden=2)
        m_clientes = Menu(nombre="Clientes", ruta="/clientes", icono="UserCheck", parent_id=m_archivos.id, orden=1)
        m_productos = Menu(nombre="Productos", ruta="/productos", icono="Package", parent_id=m_archivos.id, orden=2)
        m_pos = Menu(nombre="Punto de Venta", ruta="/pos", icono="CreditCard", parent_id=m_ventas.id, orden=1)
        
        db.add_all([m_users, m_config, m_clientes, m_productos, m_pos])
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
        m_clientes_update.orden = 2 # Porque POS es 1
        db.commit()

    # Inyección Inicial Semilla Punto de Venta (Terminal 0001)
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
