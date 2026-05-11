/* global qz */

/**
 * Servicio para manejar la conexión y firma de QZ Tray.
 */
export const qzService = {
  /**
   * Inicializa la configuración de seguridad y conecta a QZ Tray.
   */
  async init(api) {
    if (qz.websocket.isActive()) return;

    try {
      // 1. Configurar el Certificado Público
      qz.security.setCertificatePromise(async (resolve, reject) => {
        try {
          const res = await api.get('/api/qz/certificate');
          resolve(res.data);
        } catch (err) {
          reject(err);
        }
      });

      // 2. Configurar la Firma Digital (Backend)
      qz.security.setSignaturePromise((toSign) => {
        return (resolve, reject) => {
          api.post('/api/qz/sign', toSign, {
            headers: { 'Content-Type': 'text/plain' },
            transformRequest: [(data) => data] // Evitar que Axios trate de serializar como JSON
          })
          .then(res => resolve(res.data))
          .catch(err => reject(err));
        };
      });

      // 3. Conectar
      await qz.websocket.connect();
      console.log("✅ QZ Tray Conectado");
    } catch (err) {
      console.error("❌ Error al conectar con QZ Tray:", err);
      throw err;
    }
  },

  /**
   * Busca una impresora por nombre y devuelve el objeto de configuración.
   */
  async findPrinter(printerName = "Zebra") {
    try {
      const found = await qz.printers.find(printerName);
      return qz.configs.create(found);
    } catch (err) {
      console.error(`❌ No se encontró la impresora ${printerName}:`, err);
      throw err;
    }
  },

  /**
   * Envía datos RAW (ZPL) a la impresora.
   */
  async printRaw(config, data) {
    try {
      await qz.print(config, data);
      console.log("✅ Impresión enviada con éxito");
    } catch (err) {
      console.error("❌ Error al imprimir:", err);
      throw err;
    }
  }
};
