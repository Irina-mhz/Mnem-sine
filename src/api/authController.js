const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { redisConnection: redisClient } = require('../config/queues');

// 1. Registro de artista con defensa anti-bot
const registrarArtista = async (req, res) => {
  try {
    const {
      nombreArtistico,
      email,
      password,
      portafolioUrl,
      sitio_secundario, // Campo Honeypot oculto
      timestampInicio   // Marca de tiempo al abrir el formulario
    } = req.body;

    const ipCliente = req.ip || req.connection.remoteAddress;

    // Capa 1A: Si rellenó el campo Honeypot oculto, es un bot -> bloquear IP en Redis
    if (sitio_secundario && sitio_secundario.trim() !== '') {
      await redisClient.set(`bloqueo:${ipCliente}`, 'Bot detectado en formulario de registro', 'EX', 3600);
      return res.status(403).json({ error: 'Actividad automatizada detectada.' });
    }

    // Capa 1B: Si envió el formulario en menos de 3 segundos, es automatizado
    const tiempoTranscurrido = Date.now() - Number(timestampInicio || 0);
    if (!timestampInicio || tiempoTranscurrido < 3000) {
      return res.status(400).json({ error: 'Envío demasiado rápido. Intenta de nuevo.' });
    }

    // Capa 1C: Rate-limit de máximo 3 registros por hora por IP en Redis
    const claveRate = `registro_rate:${ipCliente}`;
    const intentos = await redisClient.incr(claveRate);
    if (intentos === 1) await redisClient.expire(claveRate, 3600);
    if (intentos > 3) {
      return res.status(429).json({ error: 'Demasiados intentos de registro desde esta red. Espera 1 hora.' });
    }

    // Validar que el enlace de portafolio sea una URL válida
    if (!portafolioUrl || !/^https?:\/\/.+/.test(portafolioUrl)) {
      return res.status(400).json({ error: 'Debes proporcionar una URL válida de tu portafolio (ArtStation, Behance, Instagram, etc.).' });
    }

    const existe = await Usuario.findOne({ $or: [{ email }, { nombreArtistico }] });
    if (existe) {
      return res.status(409).json({ error: 'El correo o nombre artístico ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = new Usuario({
      nombreArtistico,
      email,
      passwordHash,
      portafolioUrl,
      rol: 'artista',
      estado: 'pendiente'
    });

    await nuevoUsuario.save();

    res.status(201).json({
      mensaje: 'Solicitud enviada. Tu cuenta queda en revisión manual hasta verificar tu portafolio.'
    });
  } catch (error) {
    console.error('Error en registro de artista:', error);
    res.status(500).json({ error: 'Error interno al procesar el registro.' });
  }
};

// 2. Inicio de sesión (Artistas verificados y Admin)
const iniciarSesion = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Respaldo para tu cuenta administradora maestra desde .env
    if (email === 'admin@mnemosine.local' && password === process.env.ADMIN_PASSWORD) {
      const tokenAdmin = jwt.sign(
        { id: 'admin_root', nombreArtistico: 'Administradora Mnemósine', rol: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );
      return res.json({ token: tokenAdmin, rol: 'admin', nombreArtistico: 'Administradora Mnemósine' });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    if (usuario.estado === 'pendiente') {
      return res.status(403).json({ error: 'Tu cuenta aún está pendiente de verificación de portafolio.' });
    }

    if (usuario.estado === 'rechazado') {
      return res.status(403).json({ error: 'Tu solicitud de acceso como artista fue rechazada.' });
    }

    const token = jwt.sign(
      { id: usuario._id, nombreArtistico: usuario.nombreArtistico, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      rol: usuario.rol,
      nombreArtistico: usuario.nombreArtistico
    });
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
};

// 3. Listar artistas registrados (Solo Admin)
const listarArtistas = async (req, res) => {
  try {
    const artistas = await Usuario.find({ rol: 'artista' })
      .select('-passwordHash')
      .sort({ fechaRegistro: -1 });
    res.json(artistas);
  } catch (error) {
    console.error('Error al listar artistas:', error);
    res.status(500).json({ error: 'Error al obtener la lista de artistas.' });
  }
};

// 4. Aprobar o rechazar solicitud de artista (Solo Admin)
const cambiarEstadoArtista = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'verificado' o 'rechazado'

    if (!['verificado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const artista = await Usuario.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    ).select('-passwordHash');

    if (!artista) {
      return res.status(404).json({ error: 'Artista no encontrado.' });
    }

    res.json({ mensaje: `Artista actualizado a ${estado}`, artista });
  } catch (error) {
    console.error('Error al actualizar estado de artista:', error);
    res.status(500).json({ error: 'Error interno al actualizar estado.' });
  }
};

module.exports = { registrarArtista, iniciarSesion, listarArtistas, cambiarEstadoArtista };