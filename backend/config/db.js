const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-scheduler', {
      serverSelectionTimeoutMS: 5000, // Tiempo de espera para la conexión inicial
      socketTimeoutMS: 45000, // Tiempo de espera para operaciones
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    
    // Manejar eventos de conexión
    mongoose.connection.on('connected', () => {
      console.log('✅ Conexión a MongoDB establecida');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de conexión a MongoDB:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Desconectado de MongoDB');
    });

    // Capturar errores después de la conexión inicial
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('⏏️  Conexión a MongoDB cerrada por terminación de la aplicación');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
