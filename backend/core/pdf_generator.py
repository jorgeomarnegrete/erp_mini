from jinja2 import Template
from weasyprint import HTML
from models.empresa import Empresa

def generar_pdf_desde_html(html_template_string: str, datos: dict) -> bytes:
    """
    Toma una plantilla cruda de Jinja HTML.
    Inyecta todas las variables del diccionario `datos`.
    Retorna el archivo binario PDF usando WeasyPrint.
    """
    # 1. Compilar plantilla con Jinja
    template = Template(html_template_string)
    
    # 2. Renderizar (Inyectar Variables a HTML puro)
    rendered_html = template.render(**datos)
    
    # 3. Transformar HTML a PDF nativamente
    pdf_bytes = HTML(string=rendered_html).write_pdf()
    
    return pdf_bytes
