require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const apiRoutes = require('./api/routes');
const { escudoMiddleware } = require('./api/escudoMiddleware');

const app = express();
app.use(express.json());

// 1. Escudo real en el borde (intercepta antes de servir archivos o rutas)
app.use(escudoMiddleware);

// 2. Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// 3. Rutas de la API
app.use('/api', apiRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB - Mnemósine DB'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));

// Workers en segundo plano
require('./workers/traficoWorker');
require('./workers/archivoWorker');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor API corriendo en el puerto ${PORT}`);
});