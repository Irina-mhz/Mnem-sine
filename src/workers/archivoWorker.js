const { Worker } = require('bullmq');
const Obra = require('../models/Obra');
const { redisConnection } = require('../config/queues');

// Consumimos la cola de procesamiento de imágenes[cite: 8]
const archivoWorker = new Worker('procesamiento-archivos', async (job) => {
  const data = job.data;
  console.log(`[Worker Esteganografía] Procesando nueva obra de autor: ${data.metadatos.autorId}`);

  // 2. TRANSFORMAR: Simulamos el algoritmo de marca de agua esteganográfica[cite: 7, 8]
  // En un entorno real, aquí usarías librerías como 'jimp' o un script en Python/C++
  const hashGenerado = `mnemosine-trace-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // 3. CARGAR: Insertamos la obra en MongoDB con su firma invisible[cite: 7, 8]
  try {
    const nuevaObra = new Obra({
      titulo: data.metadatos.titulo || 'Obra sin título',
      autorId: data.metadatos.autorId,
      rutaArchivo: data.rutaArchivoTemp,
      marcaAgua: {
        inyectada: true,
        hashRastreable: hashGenerado,
        fechaInyeccion: new Date()
      },
      metadatosEvolutivos: data.metadatos.extras || {}
    });

    await nuevaObra.save();
    console.log(`[Worker Esteganografía] Obra protegida y guardada exitosamente. Hash: ${hashGenerado}`);
    
    // Aquí se dispararía el evento en tiempo real al artista confirmando la protección[cite: 8]
  } catch (error) {
    console.error(`[Worker Esteganografía] Error al guardar la obra en BD:`, error);
  }

}, { connection: redisConnection });

archivoWorker.on('failed', (job, err) => {
  console.error(`[Worker Esteganografía] Error en job ${job.id}:`, err);
});

module.exports = archivoWorker;