const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { registrarTraficoWeb, subirObra, obtenerLogs, obtenerObras, obtenerEstadisticas } = require('./controllers');
const { activarHoneypot } = require('./escudoMiddleware');
const { verificarAdmin } = require('./authMiddleware');

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
router.get('/honeypot/dataset-hd', activarHoneypot); // Trampa para scrapers

// Endpoint de validación de acceso al Centro de Comando
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true, token: password });
  }
  return res.status(401).json({ error: 'Contraseña incorrecta.' });
});

// --- RUTAS PRIVADAS (Solo Administradora) ---
router.post('/obras', verificarAdmin, upload.single('imagen'), subirObra);
router.get('/logs', verificarAdmin, obtenerLogs);
router.get('/estadisticas', verificarAdmin, obtenerEstadisticas);

// Middleware para atrapar tráfico anómalo
router.use((req, res, next) => {
  if (req.originalUrl !== '/api/health') {
    return registrarTraficoWeb(req, res);
  }
  next();
});

module.exports = router;