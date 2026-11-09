const { Worker } = require('bullmq');
const LogAuditoria = require('../models/LogAuditoria');
const { redisConnection } = require('../config/queues');

// Iniciamos el worker consumiendo la cola de peticiones-web de forma asíncrona[cite: 4, 6]
const traficoWorker = new Worker('peticiones-web', async (job) => {
  // 1. EXTRAER (Extract): Recuperamos la info cruda del job[cite: 6]
  const data = job.data;
  console.log(`[Worker Seguridad] Analizando IP: ${data.ip}`);

  // 2. TRANSFORMAR (Transform): Análisis de tráfico y detección de bots[cite: 7]
  let nivelAmenaza = 'BAJO';
  let dictamenAnomalia = false;
  let accionMitigadora = 'Ninguna';

  // Evaluación básica para clasificar el evento[cite: 7]
  const userAgent = (data.userAgent || '').toLowerCase();
  if (userAgent.includes('bot') || userAgent.includes('scraper') || userAgent === '') {
    nivelAmenaza = 'ALTO';
    dictamenAnomalia = true;
    accionMitigadora = 'Bloqueo de IP y disparo de alerta al autor';
  }

  // 3. CARGAR (Load): Insertamos el documento definitivo en MongoDB[cite: 7]
  try {
    const nuevoLog = new LogAuditoria({
      ip: data.ip,
      userAgent: data.userAgent || 'Desconocido',
      endpoint: data.endpoint,
      nivelAmenaza,
      dictamenAnomalia,
      accionMitigadora,
      detallesVariables: data.body // Estructura variable que se adapta a la petición[cite: 5]
    });

    await nuevoLog.save(); // Escritura asíncrona estructurada en BSON[cite: 7]
    console.log(`[Worker Seguridad] Log guardado - Amenaza: ${nivelAmenaza}`);
  } catch (error) {
    console.error(`[Worker Seguridad] Error al guardar en BD:`, error);
  }

}, { connection: redisConnection });

traficoWorker.on('failed', (job, err) => {
  console.error(`[Worker Seguridad] Error crítico en job ${job.id}:`, err);
});

module.exports = traficoWorker;