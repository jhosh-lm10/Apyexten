/**
 * Utilidades para manejo de fechas y mensajes programados
 */

/**
 * Formatea una fecha para mostrar en formato legible
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
 */
export function getTimeRemaining(scheduledTime) {
  const now = new Date();
  const scheduleDate = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;
  const diff = scheduleDate - now;

  if (diff <= 0) return '¡Ahora!';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  
  // Mostrar segundos solo si falta menos de 5 minutos
  if (days === 0 && hours === 0 && minutes < 5) {
    parts.pop(); // Remover minutos
    parts.push(`${minutes}m ${seconds}s`);
  }

  return `En ${parts.join(' ')}`;
}

/**
 * Genera un ID único para mensajes programados
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Valida si una fecha es válida para programar
 */
export function isValidScheduleDate(date) {
  const now = new Date();
  const scheduleDate = typeof date === 'string' ? new Date(date) : date;
  
  // Debe ser en el futuro
  if (scheduleDate <= now) return false;
  
  // No más de 1 año en el futuro
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (scheduleDate > oneYearFromNow) return false;
  
  return true;
}

/**
 * Convierte una fecha a timestamp de Chrome alarms
 */
export function dateToAlarmTime(date) {
  const scheduleDate = typeof date === 'string' ? new Date(date) : date;
  return scheduleDate.getTime();
}

/**
 * Calcula la próxima fecha de repetición
 */
export function calculateNextRepeat(baseDate, repeatOption) {
  const date = new Date(baseDate);
  
  switch (repeatOption) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return null;
  }
  
  return date;
}

/**
 * Formatea duración en milisegundos a texto legible
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Obtiene sugerencias de horarios comunes
 */
export function getTimePresets() {
  const now = new Date();
  const presets = [];
  
  // En 30 minutos
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);
  presets.push({ label: 'En 30 minutos', date: in30min });
  
  // En 1 hora
  const in1hour = new Date(now.getTime() + 60 * 60 * 1000);
  presets.push({ label: 'En 1 hora', date: in1hour });
  
  // Mañana a las 9 AM
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);
  if (tomorrow9am > now) {
    presets.push({ label: 'Mañana 9:00 AM', date: tomorrow9am });
  }
  
  // Lunes próximo a las 8 AM
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(8, 0, 0, 0);
  if (nextMonday > now) {
    presets.push({ label: 'Próximo lunes 8:00 AM', date: nextMonday });
  }
  
  return presets;
}

/**
 * Convierte zona horaria local a UTC para almacenamiento
 */
export function toUTC(date) {
  const localDate = typeof date === 'string' ? new Date(date) : date;
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
}

/**
 * Convierte UTC a zona horaria local para mostrar
 */
export function fromUTC(utcDate) {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}