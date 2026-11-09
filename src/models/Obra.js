const mongoose = require('mongoose');

const obraSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  autorId: { type: String, required: true }, // Referencia al artista
  rutaArchivo: { type: String, required: true },
  marcaAgua: {
    inyectada: { type: Boolean, default: false },
    hashRastreable: String, // La huella digital rastreable[cite: 2]
    fechaInyeccion: Date
  },
  // Usamos Mixed para permitir los metadatos artísticos dinámicos y heterogéneos[cite: 2, 4]
  metadatosEvolutivos: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true // Crea automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Obra', obraSchema);