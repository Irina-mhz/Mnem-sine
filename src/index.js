require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const path = require('path');
// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, '../public')));

// Conexión a MongoDB (Capa de Almacenamiento)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB - Mnemósine DB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Ruta de prueba para la API REST (Capa de Entrada)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API de Mnemósine activa y en escucha' });
});
// Importar y usar las rutas de la API
const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// Levantar procesos asíncronos en segundo plano (Workers)[cite: 4]
require('./workers/traficoWorker');

// Levantar procesos asíncronos en segundo plano (Workers)[cite: 4]
require('./workers/traficoWorker');
require('./workers/archivoWorker');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor API corriendo en el puerto ${PORT}`);
});