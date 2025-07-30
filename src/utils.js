// utils.js - Funciones de utilidad para la extensión APYSKY

/**
 * Limpia un número de teléfono eliminando caracteres no numéricos
 * @param {string} phoneNumber - Número de teléfono a limpiar
 * @returns {string} Número de teléfono limpio
 */
export function cleanPhoneNumber(phoneNumber) {
  return phoneNumber.replace(/[^0-9]/g, '');
}

/**
 * Formatea una fecha para mostrarla en formato legible
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDateTime(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calcula el tiempo restante hasta una fecha programada
 * @param {Date|string} scheduledTime - Fecha programada
 * @returns {string} Tiempo restante en formato legible
 */
export function getTimeRemaining(scheduledTime) {
  const now = new Date();
  const scheduleDate = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;
  const diff = scheduleDate - now;

  if (diff <= 0) return '¡Ahora!';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return `En ${parts.join(' ')}`;
}

/**
 * Genera un ID único
 * @returns {string} ID único
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Parsea una cadena de texto para extraer números de teléfono
 * @param {string} text - Texto con números de teléfono
 * @returns {string[]} Array de números de teléfono
 */
export function parsePhoneNumbers(text) {
  if (!text) return [];
  return text.split(/[\n,\s]+/).filter(Boolean).map(cleanPhoneNumber);
}

/**
 * Verifica si un número de teléfono es válido
 * @param {string} phoneNumber - Número de teléfono a verificar
 * @returns {boolean} true si es válido, false en caso contrario
 */
export function isValidPhoneNumber(phoneNumber) {
  const phoneRegex = /^\+?\d{6,15}$/;
  return phoneRegex.test(cleanPhoneNumber(phoneNumber));
}

/**
 * Verifica si una cadena de texto contiene números de teléfono válidos
 * @param {string} text - Texto con números de teléfono
 * @returns {boolean} true si contiene números válidos, false en caso contrario
 */
export function hasValidPhoneNumbers(text) {
  const nums = parsePhoneNumbers(text);
  return nums.length > 0 && nums.every(isValidPhoneNumber);
}

/**
 * Espera un tiempo determinado
 * @param {number} ms - Tiempo en milisegundos
 * @returns {Promise} Promesa que se resuelve después del tiempo especificado
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Registra un mensaje en la consola con prefijo APYSKY
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
export function log(message, data) {
  if (data) {
    console.log(`APYSKY: ${message}`, data);
  } else {
    console.log(`APYSKY: ${message}`);
  }
}

/**
 * Registra un error en la consola con prefijo APYSKY
 * @param {string} message - Mensaje de error
 * @param {Error|any} error - Error o datos adicionales (opcional)
 */
export function logError(message, error) {
  if (error) {
    console.error(`APYSKY ERROR: ${message}`, error);
  } else {
    console.error(`APYSKY ERROR: ${message}`);
  }
}

/**
 * Verifica si estamos en un entorno de extensión de Chrome
 * @returns {boolean} true si estamos en una extensión, false en caso contrario
 */
export function isExtensionEnvironment() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;
} 