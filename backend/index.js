const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const ScheduledMessage = require('./models/ScheduledMessage');

// Inicializar la aplicación
const app = express();

// Conectar a la base de datos
connectDB();

// Middlewares
app.use(cors()); // Habilitar CORS
app.use(express.json({ limit: '50mb' })); // Para manejar JSON grandes (imágenes en base64)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * @route   GET /api/status
 * @desc    Verificar estado del servidor
 * @access  Public
 */
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'active',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/messages
 * @desc    Crear un nuevo mensaje programado
 * @access  Public
 */
app.post('/api/messages', async (req, res) => {
  try {
    const { to, message, scheduledDate, media, mediaType, caption, delay, templateId } = req.body;
    
    if (!to || !message || !scheduledDate) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const newMessage = new ScheduledMessage({
      to,
      message,
      scheduledDate: new Date(scheduledDate),
      media: media || null,
      mediaType: media && mediaType ? mediaType : null,
      caption: caption || '',
      delay: delay || 0,
      templateId: templateId || null,
      status: 'pending',
      sent: false
    });

    await newMessage.save();
    
    // Emitir evento de nuevo mensaje programado (para WebSocket en el futuro)
    // io.emit('new_scheduled_message', newMessage);
    
    res.status(201).json({
      success: true,
      message: 'Mensaje programado correctamente',
      data: newMessage
    });
  } catch (error) {
    console.error('Error al programar mensaje:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al programar el mensaje',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

/**
 * @route   GET /api/messages
 * @desc    Obtener todos los mensajes programados
 * @access  Public
 */
app.get('/api/messages', async (req, res) => {
  try {
    const { status, limit = 50, page = 1, sortBy = 'scheduledDate', sortOrder = 'asc' } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    };
    
    const messages = await ScheduledMessage.paginate(query, options);
    
    res.json({
      success: true,
      data: messages.docs,
      pagination: {
        total: messages.totalDocs,
        limit: messages.limit,
        page: messages.page,
        pages: messages.totalPages
      }
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener los mensajes programados' 
    });
  }
});

/**
 * @route   GET /api/messages/:id
 * @desc    Obtener un mensaje por ID
 * @access  Public
 */
app.get('/api/messages/:id', async (req, res) => {
  try {
    const message = await ScheduledMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Mensaje no encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error al obtener mensaje:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener el mensaje' 
    });
  }
});

/**
 * @route   PUT /api/messages/:id
 * @desc    Actualizar un mensaje programado
 * @access  Public
 */
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // No permitir actualizar ciertos campos directamente
    delete updates._id;
    delete updates.createdAt;
    
    const message = await ScheduledMessage.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Mensaje no encontrado' 
      });
    }
    
    res.json({
      success: true,
      message: 'Mensaje actualizado correctamente',
      data: message
    });
  } catch (error) {
    console.error('Error al actualizar mensaje:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar el mensaje' 
    });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Eliminar un mensaje programado
 * @access  Public
 */
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const message = await ScheduledMessage.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Mensaje no encontrado' 
      });
    }
    
    res.json({
      success: true,
      message: 'Mensaje eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al eliminar el mensaje' 
    });
  }
});

/**
 * @route   GET /api/messages/pending
 * @desc    Obtener mensajes pendientes de enviar (para el worker)
 * @access  Private
 */
app.get('/api/messages/pending', async (req, res) => {
  try {
    const now = new Date();
    const pendingMessages = await ScheduledMessage.find({
      sent: false,
      scheduledDate: { $lte: now },
      status: 'pending'
    }).sort({ scheduledDate: 1 });
    
    res.json({
      success: true,
      data: pendingMessages
    });
  } catch (error) {
    console.error('Error al obtener mensajes pendientes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener mensajes pendientes' 
    });
  }
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: '¡Algo salió mal en el servidor!' 
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`📅 Base de datos: ${mongoose.connection.host}/${mongoose.connection.name}`);
});

// Manejo de cierre limpio
process.on('SIGINT', () => {
  console.log('\n🔌 Apagando el servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    mongoose.connection.close(false, () => {
      console.log('Conexión a MongoDB cerrada');
      process.exit(0);
    });
  });
});

module.exports = app;
