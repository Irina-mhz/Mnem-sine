const { Worker } = require('bullmq');
const Jimp = require('jimp');
const path = require('path');
const Obra = require('../models/Obra');
const { redisConnection } = require('../config/queues');

const archivoWorker = new Worker('procesamiento-archivos', async (job) => {
  const data = job.data;
  console.log(`[Worker Esteganografía] Procesando imagen real: ${data.nombreArchivo}`);

  try {
    // 1. Generar firma única rastreable
    const hashGenerado = `MNEMOSINE:${Date.now()}:${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const mensajeOculto = `${hashGenerado}|END`; // Delimitador de fin de mensaje

    // Convertir firma a cadena binaria (8 bits por carácter)
    let binario = '';
    for (let i = 0; i < mensajeOculto.length; i++) {
      binario += mensajeOculto[i].charCodeAt(0).toString(2).padStart(8, '0');
    }

    // 2. Leer la imagen con Jimp e inyectar en el bit menos significativo (LSB)
    const imagen = await Jimp.read(data.rutaArchivoTemp);
    const width = imagen.bitmap.width;
    let bitIndex = 0;

    for (let i = 0; i < binario.length; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const pixelIndex = imagen.getPixelIndex(x, y);

      // Modificar el bit menos significativo del canal Rojo (imperceptible al ojo humano)
      const bit = parseInt(binario[bitIndex], 10);
      imagen.bitmap.data[pixelIndex] = (imagen.bitmap.data[pixelIndex] & 0xFE) | bit;
      bitIndex++;
    }

    // Guardar como PNG (formato sin pérdida para no destruir los bits ocultos)
    const nombreProtegido = `protected-${Date.now()}.png`;
    const rutaSalida = path.join(__dirname, '../../public/protegidas', nombreProtegido);
    await imagen.writeAsync(rutaSalida);

    // 3. Guardar registro en MongoDB con la ruta pública para el Dashboard
    const nuevaObra = new Obra({
      titulo: data.metadatos.titulo,
      autorId: data.metadatos.autorId,
      rutaArchivo: `/protegidas/${nombreProtegido}`,
      marcaAgua: {
        inyectada: true,
        hashRastreable: hashGenerado,
        fechaInyeccion: new Date()
      },
      metadatosEvolutivos: data.metadatos.extras
    });

    await nuevaObra.save();
    console.log(`[Worker Esteganografía] Inyección LSB completada. Guardada en: /protegidas/${nombreProtegido}`);
  } catch (error) {
    console.error(`[Worker Esteganografía] Error procesando imagen:`, error);
  }
}, { connection: redisConnection });

archivoWorker.on('failed', (job, err) => {
  console.error(`[Worker Esteganografía] Error en job ${job.id}:`, err);
});

module.exports = archivoWorker;