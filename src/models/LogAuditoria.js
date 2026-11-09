const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  ip: { type: String, required: true }, //[cite: 5]
  userAgent: { type: String, required: true }, //[cite: 5]
  endpoint: { type: String, required: true },
  nivelAmenaza: { 
    type: String, 
    enum: ['BAJO', 'MEDIO', 'ALTO', 'CRITICO'], 
    default: 'BAJO' 
  }, // Agrega variables determinantes[cite: 7]
  dictamenAnomalia: { type: Boolean, default: false }, //[cite: 7]
  accionMitigadora: { type: String }, // ej. "bloqueo de IP y disparo de alerta"[cite: 7]
  // Estructura variable que se adapta a la diversidad de peticiones web[cite: 5]
  detallesVariables: { type: mongoose.Schema.Types.Mixed, default: {} } 
}, { 
  timestamps: true 
});

module.exports = mongoose.model('LogAuditoria', logSchema);