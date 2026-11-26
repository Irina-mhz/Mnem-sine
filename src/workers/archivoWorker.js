const { Worker } = require('bullmq');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('cloudinary').v2;
const Obra = require('../models/Obra');
const { redisConnection } = require('../config/queues');

// Configurar Cloudinary si existen credenciales en .env
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const archivoWorker = new Worker('procesamiento-archivos', async (job) => {
  const data = job.data;
  console.log(`[Worker Esteganografía] Procesando imagen: ${data.nombreArchivo}`);

  try {
    // 1. Generar firma única rastreable
    const hashGenerado = `MNEMOSINE:${Date.now()}:${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const mensajeOculto = `${hashGenerado}|END`;

    let binario = '';
    for (let i = 0; i < mensajeOculto.length; i++) {
      binario += mensajeOculto[i].charCodeAt(0).toString(2).padStart(8, '0');
    }

    // 2. Inyectar bits LSB con Jimp
    const imagen = await Jimp.read(data.rutaArchivoTemp);
    const width = imagen.bitmap.width;
    let bitIndex = 0;

    for (let i = 0; i < binario.length; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const pixelIndex = imagen.getPixelIndex(x, y);

      const bit = parseInt(binario[bitIndex], 10);
      imagen.bitmap.data[pixelIndex] = (imagen.bitmap.data[pixelIndex] & 0xFE) | bit;
      bitIndex++;
    }

    const nombreProtegido = `protected-${Date.now()}.png`;
    const rutaSalidaLocal = path.join(__dirname, '../../public/protegidas', nombreProtegido);
    await imagen.writeAsync(rutaSalidaLocal);

    // Borrar imagen cruda temporal
    await fs.unlink(data.rutaArchivoTemp).catch(() => {});

    let urlFinal = `/protegidas/${nombreProtegido}`;

    // 3. Subir PNG sin pérdida a Cloudinary si está configurado
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const resultadoCloud = await cloudinary.uploader.upload(rutaSalidaLocal, {
        folder: 'mnemosine_protegidas',
        resource_type: 'image',
        format: 'png' // Crítico: mantener PNG sin recompresión para preservar los bits LSB
      });
      urlFinal = resultadoCloud.secure_url;
      // Limpiar también el PNG local ya subido a la nube
      await fs.unlink(rutaSalidaLocal).catch(() => {});
      console.log(`[Worker Esteganografía] Subida a Cloudinary exitosa: ${urlFinal}`);
    }

    // 4. Registrar en MongoDB
    const nuevaObra = new Obra({
      titulo: data.metadatos.titulo,
      autorId: data.metadatos.autorId,
      rutaArchivo: urlFinal,
      marcaAgua: {
        inyectada: true,
        hashRastreable: hashGenerado,
        fechaInyeccion: new Date()
      },
      metadatosEvolutivos: data.metadatos.extras
    });

    await nuevaObra.save();
    console.log(`[Worker Esteganografía] Obra guardada en BD -> ${urlFinal}`);
  } catch (error) {
    console.error(`[Worker Esteganografía] Error procesando imagen:`, error);
  }
}, { connection: redisConnection });

archivoWorker.on('failed', (job, err) => {
  console.error(`[Worker Esteganografía] Error en job ${job.id}:`, err);
});

module.exports = archivoWorker;