const fs = require('fs');
const uploadsDir = path.join(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  registrarTraficoWeb,
  subirObra,
  obtenerLogs,
  obtenerObras,
  obtenerEstadisticas
} = require('./controllers');
const {
  registrarArtista,
  iniciarSesion,
  listarArtistas,
  cambiarEstadoArtista
} = require('./authController');
const { activarHoneypot } = require('./escudoMiddleware');
const { verificarToken, soloAdmin } = require('./authMiddleware');

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

// --- RUTAS PÚBLICAS ---
router.get('/obras', obtenerObras); // Galería visible para todo el mundo
router.post('/logs', registrarTraficoWeb);
router.get('/honeypot/dataset-hd', activarHoneypot); // Trampa activa para scrapers

// --- AUTENTICACIÓN Y REGISTRO ANTI-BOT ---
router.post('/auth/registro', registrarArtista);
router.post('/auth/login', iniciarSesion);

// --- RUTAS DE ARTISTAS VERIFICADOS Y ADMINISTRADORA ---
router.post('/obras', verificarToken, upload.single('imagen'), subirObra);

// --- RUTAS EXCLUSIVAS DE ADMINISTRADORA ---
router.get('/logs', verificarToken, soloAdmin, obtenerLogs);
router.get('/estadisticas', verificarToken, soloAdmin, obtenerEstadisticas);
router.get('/admin/artistas', verificarToken, soloAdmin, listarArtistas);
router.patch('/admin/artistas/:id', verificarToken, soloAdmin, cambiarEstadoArtista);

// Middleware para atrapar tráfico anómalo en rutas inexistentes
router.use((req, res, next) => {
  if (req.originalUrl !== '/api/health') {
    return registrarTraficoWeb(req, res);
  }
  next();
});

module.exports = router;