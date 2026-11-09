const express = require('express');
const router = express.Router();
const { registrarTraficoWeb, subirObra, obtenerLogs, obtenerObras, obtenerEstadisticas } = require('./controllers');
// Endpoints POST (Recepción de datos)
router.post('/logs', registrarTraficoWeb);
router.post('/obras', subirObra);

// Endpoints GET (Nuevos para leer datos desde el Dashboard)
router.get('/logs', obtenerLogs);
router.get('/obras', obtenerObras);
router.get('/estadisticas', obtenerEstadisticas);

// Middleware para atrapar todo el tráfico anómalo a rutas no definidas
router.use((req, res, next) => {
  if (req.originalUrl !== '/api/health') {
    return registrarTraficoWeb(req, res);
  }
  next();
});

module.exports = router;