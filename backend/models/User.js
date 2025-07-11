const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  subscription: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  messagesSent: {
    type: Number,
    default: 0
  },
  messageLimit: {
    type: Number,
    default: 50 // Límite mensual para plan free
  },
  subscriptionExpires: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1); // 1 mes por defecto
      return date;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  apiKey: String
}, {
  timestamps: true
});

// Hash de contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generar API Key
userSchema.methods.generateApiKey = function() {
  this.apiKey = require('crypto').randomBytes(32).toString('hex');
  return this.apiKey;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
