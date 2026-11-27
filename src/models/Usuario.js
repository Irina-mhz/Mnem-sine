const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombreArtistico: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  portafolioUrl: {
    type: String,
    required: true,
    trim: true
  },
  rol: {
    type: String,
    enum: ['artista', 'admin'],
    default: 'artista'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'verificado', 'rechazado'],
    default: 'pendiente'
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);