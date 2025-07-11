const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ScheduledMessage = require('./models/ScheduledMessage');
const connectDB = require('./config/db');

// Configuración
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tudominio.com', 'chrome-extension://' + process.env.EXTENSION_ID]
    : 'http://localhost:3000'
}));
app.use(express.json());

// Conexión a MongoDB
connectDB();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

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
