/**
 * Sistema de manejo de errores para ApiSky
 * Proporciona mensajes de error amigables y sugerencias de solución
 */

export const ERROR_TYPES = {
  NETWORK: 'network',
  WHATSAPP: 'whatsapp',
  VALIDATION: 'validation',
  EXTENSION: 'extension',
  IMAGE: 'image',
  UNKNOWN: 'unknown'
};

export const ERROR_CODES = {
  // Errores de red
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  
  // Errores de WhatsApp
  WHATSAPP_NOT_READY: 'WHATSAPP_NOT_READY',
  WHATSAPP_DISCONNECTED: 'WHATSAPP_DISCONNECTED',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  
  // Errores de validación
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  NO_RECIPIENTS: 'NO_RECIPIENTS',
  
  // Errores de extensión
  EXTENSION_CONTEXT_LOST: 'EXTENSION_CONTEXT_LOST',
  BACKGROUND_SCRIPT_ERROR: 'BACKGROUND_SCRIPT_ERROR',
  
  // Errores de imagen
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED'
};

const ERROR_MESSAGES = {
  [ERROR_CODES.CONNECTION_FAILED]: {
    title: 'Error de Conexión',
    message: 'No se pudo conectar con WhatsApp Web. Verifica tu conexión a internet.',
    suggestions: [
      'Revisa tu conexión a internet',
      'Recarga la página de WhatsApp Web',
      'Intenta nuevamente en unos minutos'
    ],
    type: ERROR_TYPES.NETWORK,
    recoverable: true
  },
  
  [ERROR_CODES.TIMEOUT]: {
    title: 'Tiempo de Espera Agotado',
    message: 'La operación tardó demasiado tiempo. Esto puede deberse a una conexión lenta.',
    suggestions: [
      'Revisa tu conexión a internet',
      'Reduce la cantidad de mensajes a enviar',
      'Intenta nuevamente'
    ],
    type: ERROR_TYPES.NETWORK,
    recoverable: true
  },
  
  [ERROR_CODES.WHATSAPP_NOT_READY]: {
    title: 'WhatsApp Web No Disponible',
    message: 'WhatsApp Web no está listo o no está abierto en una pestaña.',
    suggestions: [
      'Abre WhatsApp Web en una nueva pestaña',
      'Escanea el código QR si es necesario',
      'Espera a que cargue completamente',
      'Haz clic en el botón de actualizar estado'
    ],
    type: ERROR_TYPES.WHATSAPP,
    recoverable: true
  },
  
  [ERROR_CODES.WHATSAPP_DISCONNECTED]: {
    title: 'WhatsApp Desconectado',
    message: 'Se perdió la conexión con WhatsApp Web.',
    suggestions: [
      'Verifica que tu teléfono esté conectado a internet',
      'Recarga WhatsApp Web',
      'Vuelve a escanear el código QR si es necesario'
    ],
    type: ERROR_TYPES.WHATSAPP,
    recoverable: true
  },
  
  [ERROR_CODES.CHAT_NOT_FOUND]: {
    title: 'Chat No Encontrado',
    message: 'No se pudo encontrar o crear el chat con el número especificado.',
    suggestions: [
      'Verifica que el número de teléfono sea correcto',
      'Asegúrate de incluir el código de país',
      'El número debe estar registrado en WhatsApp'
    ],
    type: ERROR_TYPES.WHATSAPP,
    recoverable: false
  },
  
  [ERROR_CODES.INVALID_PHONE_NUMBER]: {
    title: 'Número de Teléfono Inválido',
    message: 'Uno o más números de teléfono no tienen el formato correcto.',
    suggestions: [
      'Usa el formato: +código_país + número',
      'Ejemplo: +51987654321',
      'Elimina espacios y caracteres especiales'
    ],
    type: ERROR_TYPES.VALIDATION,
    recoverable: false
  },
  
  [ERROR_CODES.EMPTY_MESSAGE]: {
    title: 'Mensaje Vacío',
    message: 'Debes escribir un mensaje o seleccionar una imagen para enviar.',
    suggestions: [
      'Escribe un mensaje en el editor',
      'O selecciona una imagen para enviar'
    ],
    type: ERROR_TYPES.VALIDATION,
    recoverable: false
  },
  
  [ERROR_CODES.NO_RECIPIENTS]: {
    title: 'Sin Destinatarios',
    message: 'No se encontraron números de teléfono válidos para enviar.',
    suggestions: [
      'Agrega al menos un número de teléfono',
      'Verifica el formato de los números',
      'Separa múltiples números con comas o saltos de línea'
    ],
    type: ERROR_TYPES.VALIDATION,
    recoverable: false
  },
  
  [ERROR_CODES.IMAGE_TOO_LARGE]: {
    title: 'Imagen Demasiado Grande',
    message: 'La imagen seleccionada es demasiado grande. WhatsApp tiene un límite de 16MB.',
    suggestions: [
      'Comprime la imagen antes de enviarla',
      'Usa una imagen de menor resolución',
      'Convierte a formato JPEG para reducir el tamaño'
    ],
    type: ERROR_TYPES.IMAGE,
    recoverable: false
  },
  
  [ERROR_CODES.INVALID_IMAGE_FORMAT]: {
    title: 'Formato de Imagen No Soportado',
    message: 'El formato de imagen seleccionado no es compatible.',
    suggestions: [
      'Usa formatos: JPG, PNG, GIF, WEBP',
      'Convierte la imagen a un formato compatible'
    ],
    type: ERROR_TYPES.IMAGE,
    recoverable: false
  },
  
  [ERROR_CODES.EXTENSION_CONTEXT_LOST]: {
    title: 'Contexto de Extensión Perdido',
    message: 'Se perdió la comunicación con la extensión. Esto puede ocurrir después de una actualización.',
    suggestions: [
      'Recarga la extensión desde chrome://extensions/',
      'Cierra y vuelve a abrir el popup',
      'Reinicia Chrome si el problema persiste'
    ],
    type: ERROR_TYPES.EXTENSION,
    recoverable: true
  }
};

/**
 * Analiza un error y devuelve información detallada
 */
export function analyzeError(error) {
  let errorCode = ERROR_CODES.UNKNOWN;
  let originalMessage = '';
  
  if (typeof error === 'string') {
    originalMessage = error;
  } else if (error && error.message) {
    originalMessage = error.message;
  }
  
  // Detectar tipo de error basado en el mensaje
  const message = originalMessage.toLowerCase();
  
  if (message.includes('connection') || message.includes('network')) {
    errorCode = ERROR_CODES.CONNECTION_FAILED;
  } else if (message.includes('timeout')) {
    errorCode = ERROR_CODES.TIMEOUT;
  } else if (message.includes('whatsapp') && message.includes('ready')) {
    errorCode = ERROR_CODES.WHATSAPP_NOT_READY;
  } else if (message.includes('disconnected')) {
    errorCode = ERROR_CODES.WHATSAPP_DISCONNECTED;
  } else if (message.includes('chat') && message.includes('not found')) {
    errorCode = ERROR_CODES.CHAT_NOT_FOUND;
  } else if (message.includes('invalid') && message.includes('phone')) {
    errorCode = ERROR_CODES.INVALID_PHONE_NUMBER;
  } else if (message.includes('extension') || message.includes('context')) {
    errorCode = ERROR_CODES.EXTENSION_CONTEXT_LOST;
  } else if (message.includes('image') && message.includes('large')) {
    errorCode = ERROR_CODES.IMAGE_TOO_LARGE;
  } else if (message.includes('format') && message.includes('image')) {
    errorCode = ERROR_CODES.INVALID_IMAGE_FORMAT;
  }
  
  const errorInfo = ERROR_MESSAGES[errorCode] || {
    title: 'Error Desconocido',
    message: originalMessage || 'Ocurrió un error inesperado.',
    suggestions: ['Intenta nuevamente', 'Si el problema persiste, contacta soporte'],
    type: ERROR_TYPES.UNKNOWN,
    recoverable: true
  };
  
  return {
    code: errorCode,
    originalMessage,
    ...errorInfo,
    timestamp: Date.now()
  };
}

/**
 * Formatea un error para mostrar al usuario
 */
export function formatErrorForUser(error) {
  const errorInfo = analyzeError(error);
  
  return {
    title: errorInfo.title,
    message: errorInfo.message,
    details: `Código: ${errorInfo.code}\nMensaje original: ${errorInfo.originalMessage}\n\nSugerencias:\n${errorInfo.suggestions.map(s => `• ${s}`).join('\n')}`,
    type: 'error',
    recoverable: errorInfo.recoverable
  };
}

/**
 * Registra errores para debugging
 */
export function logError(error, context = '') {
  const errorInfo = analyzeError(error);
  console.error(`[APYSKY Error] ${context}:`, {
    code: errorInfo.code,
    type: errorInfo.type,
    message: errorInfo.originalMessage,
    timestamp: new Date(errorInfo.timestamp).toISOString()
  });
}