const verificarAdmin = (req, res, next) => {
  const tokenRecibido = req.headers['x-admin-token'];
  const claveMaestra = process.env.ADMIN_PASSWORD;

  if (!claveMaestra) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurada en el servidor.' });
  }

  if (tokenRecibido !== claveMaestra) {
    return res.status(401).json({ error: 'No autorizado. Se requiere acceso de administrador.' });
  }

  next();
};

module.exports = { verificarAdmin };