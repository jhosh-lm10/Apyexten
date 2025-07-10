const mongoose = require('mongoose');

const ScheduledMessageSchema = new mongoose.Schema({
  to: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  scheduledDate: { 
    type: Date, 
    required: true 
  },
  sent: { 
    type: Boolean, 
    default: false 
  },
  media: {
    type: String, // URL o base64 de la imagen/PDF
    default: null
  },
  mediaType: {
    type: String, // 'image', 'pdf', 'document', etc.
    default: null
  },
  caption: {
    type: String,
    default: ''
  },
  delay: {
    type: Number, // Tiempo de espera en segundos
    default: 0
  },
  templateId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas frecuentes
ScheduledMessageSchema.index({ sent: 1, scheduledDate: 1 });

module.exports = mongoose.model('ScheduledMessage', ScheduledMessageSchema);
