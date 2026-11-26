const IORedis = require('ioredis');
const { peticionesWebQueue } = require('../config/queues');

// Lista de firmas reales de crawlers de IA y herramientas CLI de scraping
const FIRMAS_SCRAPERS_REALES = [
  'gptbot', 'ccbot', 'chatgpt-user', 'google-extended', 'anthropic-ai',
  'claudebot', 'bytespider', 'python-urllib', 'python-requests', 'scrapy',
  'curl', 'wget', 'headlesschrome', 'puppeteer', 'playwright', 'bad-scraper'
];

const escudoMiddleware = async (req, res, next) => {
  // Ignoramos consultas internas del propio Dashboard para no autobloquearnos al refrescar
  if (req.originalUrl === '/api/logs' || req.originalUrl === '/api/estadisticas' || req.originalUrl === '/api/obras') {
    if (req.method === 'GET') return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const claveBloqueo = `bloqueo:ip:${ip}`;
  const claveRateLimit = `ratelimit:ip:${ip}`;

  try {
    // 1. VERIFICAR SI LA IP YA ESTÁ BLOQUEADA EN REDIS
    const estaBloqueada = await redisClient.get(claveBloqueo);
    if (estaBloqueada) {
      return res.status(403).json({
        error: 'Acceso denegado por Mnemósine WAF.',
        motivo: estaBloqueada,
        ip
      });
    }

    // 2. RATE LIMITING REAL (Máximo 12 peticiones cada 30 segundos por IP)
    const peticiones = await redisClient.incr(claveRateLimit);
    if (peticiones === 1) {
      await redisClient.expire(claveRateLimit, 30);
    }

    const esBotConocido = FIRMAS_SCRAPERS_REALES.some(firma => userAgent.includes(firma));
    const excedioLimite = peticiones > 12;

    // 3. ENCOLAR AUDITORÍA PASIVA EN BULLMQ (Solo si toca imágenes, rutas o es sospechoso)
    if (req.originalUrl.startsWith('/protegidas/') || esBotConocido || excedioLimite) {
      await peticionesWebQueue.add('analisis-trafico', {
        ip,
        userAgent: req.headers['user-agent'] || 'Sin User-Agent',
        endpoint: req.originalUrl,
        body: { metodo: req.method, peticionesEnVentana: peticiones },
        timestamp: new Date()
      });
    }

    // 4. BLOQUEO ACTIVO INMEDIATO SI EXCEDE RATE LIMIT
    if (excedioLimite) {
      await redisClient.set(claveBloqueo, 'Rate Limit excedido (Scraping masivo)', 'EX', 120); // Bloqueo por 2 minutos
      return res.status(429).json({
        error: 'Demasiadas peticiones. IP bloqueada temporalmente por Mnemósine.',
        reintentarEnSegundos: 120
      });
    }

    next();
  } catch (error) {
    console.error('[Escudo Middleware] Error en Redis:', error);
    next();
  }
};

// Controlador específico para la trampa Honeypot
const activarHoneypot = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  const claveBloqueo = `bloqueo:ip:${ip}`;

  // Bloqueo inmediato de 5 minutos por caer en trampa invisible
  await redisClient.set(claveBloqueo, 'Trampa Honeypot activada (Bot rastreador)', 'EX', 300);

  await peticionesWebQueue.add('analisis-trafico', {
    ip,
    userAgent: `HONEYPOT-TRAP | ${req.headers['user-agent'] || 'Desconocido'}`,
    endpoint: req.originalUrl,
    body: { alerta: 'Acceso a ruta prohibida en robots.txt' },
    timestamp: new Date()
  });

  res.status(403).json({ error: 'Acceso prohibido. Trampa de seguridad activada.' });
};

module.exports = { escudoMiddleware, activarHoneypot };