const { peticionesWebQueue, archivosQueue } = require('../config/queues');
const LogAuditoria = require('../models/LogAuditoria'); // Nuevo
const Obra = require('../models/Obra'); // Nuevo

// Camino A: Recibe registros de acceso web
const registrarTraficoWeb = async (req, res) => {
  try {
    const rawData = {
      // Priorizamos la IP simulada (X-Forwarded-For) si existe, si no, tomamos la real
      ip: req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress,
      // Priorizamos el agente simulado, si no, tomamos el del navegador
      userAgent: req.headers['x-simulated-agent'] || req.headers['user-agent'],
      endpoint: req.originalUrl,
      body: req.body,
      timestamp: new Date()
    };

    await peticionesWebQueue.add('analisis-trafico', rawData);
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

// --- NUEVO: Motor de Agregación NoSQL ---
const obtenerEstadisticas = async (req, res) => {
  try {
    // Usamos el Aggregation Framework de MongoDB para procesar los historiales de auditoría[cite: 3]
    const estadisticas = await LogAuditoria.aggregate([
      {
        $facet: {
          // 1. Contar cuántos ataques totales han sido detectados
          ataquesBloqueados: [
            { $match: { dictamenAnomalia: true } },
            { $count: "total" }
          ],
          // 2. Agrupar las amenazas por su nivel (ALTO, BAJO)
          amenazasPorNivel: [
            { $group: { _id: "$nivelAmenaza", cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1 } }
          ],
          // 3. Obtener el "Top 5" de las IPs más maliciosas (Scrapers)
          topIpsMaliciosas: [
            { $match: { dictamenAnomalia: true } },
            { $group: { _id: "$ip", intentos: { $sum: 1 } } },
            { $sort: { intentos: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    // Formateamos la respuesta para que sea fácil de leer
    res.json({
      mensaje: "Reporte de seguridad generado exitosamente",
      datos: estadisticas[0]
    });
  } catch (error) {
    console.error('Error al generar estadísticas:', error);
    res.status(500).json({ error: 'Error al procesar el reporte NoSQL' });
  }
};

// Asegúrate de exportar también las nuevas funciones
module.exports = { registrarTraficoWeb, subirObra, obtenerLogs, obtenerObras, obtenerEstadisticas };