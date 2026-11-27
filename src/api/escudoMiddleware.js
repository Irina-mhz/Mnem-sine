const jwt = require('jsonwebtoken');
const { redisConnection: redisClient } = require('../config/queues');

const obtenerIpCliente = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '0.0.0.0';
};

const escudoMiddleware = async (req, res, next) => {
  try {
    // 1. Permitir acceso a las vistas HTML de autenticación y paneles
    const vistasProtegidas = ['/acceso.html', '/admin.html', '/artista.html'];
    if (vistasProtegidas.includes(req.path)) {
      return next();
    }

    // 2. Exentar del WAF a usuarios con token JWT válido (admin o artista)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && (decoded.rol === 'admin' || decoded.rol === 'artista')) {
          req.usuario = decoded;
          return next();
        }
      } catch (err) {
        // Si el token expiró o es falso, continúa hacia el análisis normal del WAF
      }
    }

    const ip = obtenerIpCliente(req);

    // 3. Verificar si la IP ya está en lista negra de Redis
    const motivoBloqueo = await redisClient.get(`bloqueo:${ip}`);
    if (motivoBloqueo) {
      return res.status(403).json({
        error: 'Acceso denegado por Mnemósine WAF.',
        motivo: motivoBloqueo,
        ip
      });
    }

    // 4. Detección de scrapers por User-Agent automatizado
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const firmasBot = ['python-requests', 'scrapy', 'curl/', 'wget/', 'headless', 'bot', 'spider', 'httpclient'];
    const esBot = firmasBot.some((firma) => userAgent.includes(firma));

    if (!userAgent || esBot) {
      const motivo = 'Scraper o cliente automatizado detectado';
      await redisClient.set(`bloqueo:${ip}`, motivo, 'EX', 3600);
      return res.status(403).json({
        error: 'Acceso denegado por Mnemósine WAF.',
        motivo,
        ip
      });
    }

    // 5. Rate-limiting para visitantes anónimos (máximo 60 peticiones por minuto)
    const claveTrafico = `trafico:${ip}`;
    const peticiones = await redisClient.incr(claveTrafico);

    if (peticiones === 1) {
      await redisClient.expire(claveTrafico, 60);
    }

    if (peticiones > 60) {
      const motivo = 'Exceso de tasa de peticiones (Posible scraping masivo)';
      await redisClient.set(`bloqueo:${ip}`, motivo, 'EX', 3600);
      return res.status(429).json({
        error: 'Acceso denegado por Mnemósine WAF.',
        motivo,
        ip
      });
    }

    next();
  } catch (error) {
    console.error('Error en escudoMiddleware:', error);
    next();
  }
};

// Trampa activa vinculada a GET /api/honeypot/dataset-hd en routes.js
const activarHoneypot = async (req, res) => {
  try {
    const ip = obtenerIpCliente(req);
    const motivo = 'Trampa Honeypot activada (Bot rastreador)';
    await redisClient.set(`bloqueo:${ip}`, motivo, 'EX', 3600);

    return res.status(403).json({
      error: 'Acceso denegado por Mnemósine WAF.',
      motivo,
      ip
    });
  } catch (error) {
    console.error('Error al activar Honeypot:', error);
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
};

module.exports = { escudoMiddleware, activarHoneypot };