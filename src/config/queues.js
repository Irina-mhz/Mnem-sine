const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Conexión a Redis local utilizando las variables de tu .env[cite: 4]
const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null // Parámetro estricto y obligatorio para BullMQ
});

// Cola para el Camino A: Análisis de tráfico y detección de bots[cite: 7, 8]
const peticionesWebQueue = new Queue('peticiones-web', { 
  connection: redisConnection 
});

// Cola para el Camino B: Procesamiento de imágenes y esteganografía[cite: 7, 8]
const archivosQueue = new Queue('procesamiento-archivos', { 
  connection: redisConnection 
});

module.exports = { peticionesWebQueue, archivosQueue, redisConnection };