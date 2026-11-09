const { peticionesWebQueue, archivosQueue } = require('../config/queues');
const LogAuditoria = require('../models/LogAuditoria'); // Nuevo
const Obra = require('../models/Obra'); // Nuevo

// Camino A: Recibe registros de acceso web (logs)[cite: 6, 8]
const registrarTraficoWeb = async (req, res) => {
  try {
    // Extraemos la información cruda de la petición[cite: 6]
    const rawData = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      body: req.body,
      timestamp: new Date()
    };

    // Encolamos el trabajo en Redis en lugar de ir a la DB[cite: 4]
    await peticionesWebQueue.add('analisis-trafico', rawData);

    // Respondemos rápidamente al cliente
    res.status(202).json({ mensaje: 'Petición registrada y encolada para análisis.' });
  } catch (error) {
    console.error('Error al encolar tráfico web:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Camino B: Recibe metadatos e imágenes para registrar obras[cite: 4, 8]
const subirObra = async (req, res) => {
  try {
    const metadatosObra = req.body; // Aquí vendrían el título, autorId, etc.
    
    // En un caso real aquí usarías Multer para recibir el archivo binario[cite: 7]
    // Por ahora simularemos la ruta del archivo.
    const trabajoArchivos = {
      metadatos: metadatosObra,
      rutaArchivoTemp: '/tmp/uploads/imagen_simulada.jpg', 
      timestamp: new Date()
    };

    // Encolamos el procesamiento de la imagen para la esteganografía[cite: 7, 8]
    await archivosQueue.add('procesar-imagen', trabajoArchivos);

    res.status(202).json({ mensaje: 'Obra recibida y encolada para inyección de marca de agua.' });
  } catch (error) {
    console.error('Error al encolar obra:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const obtenerLogs = async (req, res) => {
  try {
    const logs = await LogAuditoria.find().sort({ createdAt: -1 }).limit(10);
    res.json(logs);
  } catch (error) { res.status(500).json({ error: 'Error al obtener logs' }); }
};

const obtenerObras = async (req, res) => {
  try {
    const obras = await Obra.find().sort({ createdAt: -1 }).limit(10);
    res.json(obras);
  } catch (error) { res.status(500).json({ error: 'Error al obtener obras' }); }
};

// Asegúrate de exportar también las nuevas funciones
module.exports = { registrarTraficoWeb, subirObra, obtenerLogs, obtenerObras };