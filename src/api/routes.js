const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { registrarTraficoWeb, subirObra, obtenerLogs, obtenerObras, obtenerEstadisticas } = require('./controllers');

// Configuración de almacenamiento temporal para imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `raw-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// Endpoints POST
router.post('/logs', registrarTraficoWeb);
// upload.single('imagen') intercepta el archivo enviado desde el formulario
router.post('/obras', upload.single('imagen'), subirObra);

// Endpoints GET
router.get('/logs', obtenerLogs);
router.get('/obras', obtenerObras);
router.get('/estadisticas', obtenerEstadisticas);

// Middleware para atrapar tráfico anómalo
router.use((req, res, next) => {
  if (req.originalUrl !== '/api/health') {
    return registrarTraficoWeb(req, res);
  }
  next();
});

module.exports = router;