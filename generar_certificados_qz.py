import os
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from datetime import datetime, timedelta

def generate_qz_certs():
    # 1. Generar Llave Privada RSA 2048
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # 2. Configurar la información del certificado
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"AR"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Buenos Aires"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"CABA"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"ERP Mini"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
    ])

    # 3. Crear el certificado auto-firmado
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.utcnow()
    ).not_valid_after(
        # Válido por 10 años
        datetime.utcnow() + timedelta(days=3650)
    ).add_extension(
        x509.SubjectAlternativeName([x509.DNSName(u"localhost")]),
        critical=False,
    ).sign(private_key, hashes.SHA256())

    # 4. Guardar Llave Privada
    with open("private-key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))

    # 5. Guardar Certificado Público
    with open("digital-certificate.txt", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print("✅ Certificados generados con éxito:")
    print("   - private-key.pem (Mantenelo privado en el backend)")
    print("   - digital-certificate.txt (Usalo en el frontend)")

if __name__ == "__main__":
    generate_qz_certs()
