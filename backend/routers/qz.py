from fastapi import APIRouter, Body, HTTPException
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import base64
import os

router = APIRouter(prefix="/api/qz", tags=["QZ Tray Security"])

# Ruta a la llave privada (asumiendo que está en la carpeta backend/)
PRIVATE_KEY_PATH = "private-key.pem"

@router.post("/sign")
async def sign_message(message: str = Body(...)):
    """
    Recibe un mensaje de QZ Tray y lo firma con la llave privada 
    para habilitar la impresión silenciosa.
    """
    if not os.path.exists(PRIVATE_KEY_PATH):
        raise HTTPException(status_code=500, detail="Llave privada no encontrada en el servidor.")

    try:
        with open(PRIVATE_KEY_PATH, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None,
            )
        
        # QZ Tray usa PKCS1 v1.5 y SHA1 por defecto para la firma
        signature = private_key.sign(
            message.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA1()
        )
        
        return base64.b64encode(signature).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al firmar: {str(e)}")

@router.get("/certificate")
async def get_certificate():
    """
    Devuelve el certificado público para que el frontend no tenga 
    que tenerlo hardcodeado (opcional, pero más limpio).
    """
    cert_path = "digital-certificate.txt"
    if not os.path.exists(cert_path):
        raise HTTPException(status_code=500, detail="Certificado no encontrado.")
    
    with open(cert_path, "r") as f:
        return f.read()
