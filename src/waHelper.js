/**
 * APYSKY - Módulo de acceso a la API interna de WhatsApp Web
 * 
 * Este módulo proporciona funciones para acceder directamente a la API interna
 * de WhatsApp Web, permitiendo enviar mensajes sin simular interacciones con la UI.
 */

// Almacena los módulos de WhatsApp Web una vez extraídos
let WA_MODULES = null;
let STORE = null;
let SEND_MESSAGE_MODULE = null;
let CHAT_MODULE = null;

/**
 * Extrae los módulos internos de WhatsApp Web
 * @returns {Promise<boolean>} - True si se extraen correctamente
 */
export async function extractWhatsAppModules() {
  try {
    console.log('APYSKY: Extrayendo módulos de WhatsApp Web...');
    
    // Buscar el objeto WebpackChunk de WhatsApp Web
    if (!window.webpackChunkwhatsapp_web_client) {
      console.error('APYSKY: No se encontró webpackChunkwhatsapp_web_client');
      return false;
    }
    
    // Extraer los módulos
    if (!WA_MODULES) {
      WA_MODULES = {};
      
      // Función para extraer módulos específicos
      const moduleFilters = {
        store: (module) => module?.default?.Msg ? module.default : null,
        sendMessage: (module) => module.sendTextMsgToChat ? module : null,
        chat: (module) => module.Chat && module.Msg ? module : null
      };
      
      // Buscar los módulos en webpack
      const originalPush = window.webpackChunkwhatsapp_web_client.push;
      window.webpackChunkwhatsapp_web_client.push = function(chunk) {
        const result = originalPush.apply(this, arguments);
        
        // Extraer los módulos que nos interesan
        if (chunk && chunk[1]) {
          const modules = chunk[1];
          for (const moduleId in modules) {
            const module = modules[moduleId];
            if (typeof module === 'function') {
              try {
                const moduleInstance = module();
                
                // Verificar si es alguno de los módulos que buscamos
                for (const key in moduleFilters) {
                  const filter = moduleFilters[key];
                  const found = filter(moduleInstance);
                  if (found) {
                    WA_MODULES[key] = found;
                    console.log(`APYSKY: Módulo ${key} encontrado`);
                  }
                }
                
                // Si ya encontramos todos los módulos, detener la búsqueda
                if (Object.keys(WA_MODULES).length === Object.keys(moduleFilters).length) {
                  break;
                }
              } catch (e) {
                // Ignorar errores al instanciar módulos
              }
            }
          }
        }
        
        return result;
      };
      
      // Esperar a que se encuentren los módulos (máximo 10 segundos)
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (Object.keys(WA_MODULES).length > 0) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
        
        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });
    }
    
    // Verificar si se encontraron los módulos necesarios
    STORE = WA_MODULES.store;
    SEND_MESSAGE_MODULE = WA_MODULES.sendMessage;
    CHAT_MODULE = WA_MODULES.chat;
    
    const success = !!(STORE && SEND_MESSAGE_MODULE && CHAT_MODULE);
    console.log(`APYSKY: Extracción de módulos ${success ? 'exitosa' : 'fallida'}`);
    
    return success;
  } catch (error) {
    console.error('APYSKY: Error al extraer módulos de WhatsApp Web:', error);
    return false;
  }
}

/**
 * Verifica si WhatsApp Web está completamente cargado y listo
 * @returns {boolean} - True si WhatsApp Web está listo
 */
export function isWhatsAppReady() {
  try {
    // Verificar elementos clave de la interfaz
    const mainApp = document.querySelector('#app');
    const loadingScreen = document.querySelector('.landing-wrapper');
    const isUIReady = mainApp && !loadingScreen;
    
    // Verificar si los módulos están disponibles
    const areModulesReady = !!(STORE && SEND_MESSAGE_MODULE && CHAT_MODULE);
    
    return isUIReady && areModulesReady;
  } catch (error) {
    console.error('APYSKY: Error al verificar si WhatsApp Web está listo:', error);
    return false;
  }
}

/**
 * Obtiene un chat por número de teléfono
 * @param {string} phoneNumber - Número de teléfono (con código de país)
 * @returns {Object|null} - Objeto chat o null si no se encuentra
 */
export async function getChat(phoneNumber) {
  try {
    if (!STORE || !CHAT_MODULE) {
      console.error('APYSKY: Módulos no disponibles para getChat');
      return null;
    }
    
    // Limpiar y formatear el número de teléfono
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = `${cleanPhone}@c.us`;
    
    // Buscar el chat existente
    let chat = STORE.Chat.get(formattedPhone);
    
    // Si el chat no existe, intentar crearlo
    if (!chat) {
      console.log(`APYSKY: Chat no encontrado para ${cleanPhone}, intentando crear...`);
      
      try {
        // Crear un nuevo chat
        chat = new CHAT_MODULE.Chat({
          id: formattedPhone
        });
        
        // Esperar un momento para que se inicialice
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`APYSKY: Error al crear chat para ${cleanPhone}:`, error);
        return null;
      }
    }
    
    return chat;
  } catch (error) {
    console.error('APYSKY: Error en getChat:', error);
    return null;
  }
}

/**
 * Envía un mensaje directamente a un número de teléfono
 * @param {string} phoneNumber - Número de teléfono (con código de país)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<Object>} - Resultado del envío
 */
export async function sendDirectMessage(phoneNumber, message) {
  try {
    console.log(`APYSKY: Enviando mensaje directo a ${phoneNumber}...`);
    
    // Verificar que los módulos estén disponibles
    if (!STORE || !SEND_MESSAGE_MODULE || !CHAT_MODULE) {
      const modulesAvailable = await extractWhatsAppModules();
      if (!modulesAvailable) {
        throw new Error('No se pudieron extraer los módulos necesarios de WhatsApp Web');
      }
    }
    
    // Obtener o crear el chat
    const chat = await getChat(phoneNumber);
    if (!chat) {
      throw new Error(`No se pudo obtener el chat para ${phoneNumber}`);
    }
    
    // Preparar el mensaje
    const msgOptions = {
      body: message,
      linkPreview: null,
      mentionedJidList: [],
      quotedMsg: null
    };
    
    // Enviar el mensaje
    const result = await SEND_MESSAGE_MODULE.sendTextMsgToChat(chat, msgOptions);
    
    console.log(`APYSKY: Mensaje enviado a ${phoneNumber}:`, result);
    return { success: true, result };
    
  } catch (error) {
    console.error(`APYSKY: Error al enviar mensaje a ${phoneNumber}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica si un número de teléfono existe en WhatsApp
 * @param {string} phoneNumber - Número de teléfono a verificar
 * @returns {Promise<boolean>} - True si el número existe en WhatsApp
 */
export async function checkNumberExists(phoneNumber) {
  try {
    // Limpiar el número de teléfono
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = `${cleanPhone}@c.us`;
    
    // Verificar si los módulos están disponibles
    if (!STORE) {
      const modulesAvailable = await extractWhatsAppModules();
      if (!modulesAvailable) {
        throw new Error('No se pudieron extraer los módulos necesarios');
      }
    }
    
    // Intentar obtener información del contacto
    const contact = STORE.Contact && STORE.Contact.get(formattedPhone);
    
    // Si el contacto existe y tiene un número válido, el número existe en WhatsApp
    return !!(contact && contact.isUser);
    
  } catch (error) {
    console.error(`APYSKY: Error al verificar número ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * Sistema de cola para envío de mensajes masivos
 */
export class MessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.delayBetweenMessages = 5000; // 5 segundos por defecto
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.results = {
      total: 0,
      sent: 0,
      failed: 0,
      details: []
    };
  }
  
  /**
   * Configura el retraso entre mensajes
   * @param {number} delayMs - Retraso en milisegundos
   */
  setDelay(delayMs) {
    this.delayBetweenMessages = delayMs;
  }
  
  /**
   * Configura los callbacks
   * @param {Object} callbacks - Callbacks para eventos
   */
  setCallbacks(callbacks = {}) {
    if (callbacks.onProgress) this.onProgress = callbacks.onProgress;
    if (callbacks.onComplete) this.onComplete = callbacks.onComplete;
    if (callbacks.onError) this.onError = callbacks.onError;
  }
  
  /**
   * Añade mensajes a la cola
   * @param {Array} messages - Array de objetos {to, message}
   */
  addToQueue(messages) {
    this.queue = this.queue.concat(messages);
    this.results.total = this.queue.length;
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Procesa la cola de mensajes
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Asegurar que los módulos de WhatsApp estén disponibles
      await extractWhatsAppModules();
      
      while (this.queue.length > 0) {
        const { to, message } = this.queue.shift();
        
        try {
          // Enviar el mensaje
          const result = await sendDirectMessage(to, message);
          
          // Registrar el resultado
          if (result.success) {
            this.results.sent++;
          } else {
            this.results.failed++;
          }
          
          this.results.details.push({
            to,
            success: result.success,
            error: result.error,
            timestamp: new Date().toISOString()
          });
          
          // Notificar progreso
          if (this.onProgress) {
            this.onProgress({
              remaining: this.queue.length,
              sent: this.results.sent,
              failed: this.results.failed,
              total: this.results.total,
              current: { to, success: result.success }
            });
          }
          
          // Esperar antes de enviar el siguiente mensaje
          if (this.queue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenMessages));
          }
          
        } catch (error) {
          console.error(`APYSKY: Error al procesar mensaje para ${to}:`, error);
          
          this.results.failed++;
          this.results.details.push({
            to,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          // Notificar error
          if (this.onError) {
            this.onError({
              to,
              error: error.message,
              remaining: this.queue.length
            });
          }
          
          // Esperar antes de intentar el siguiente mensaje
          if (this.queue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenMessages));
          }
        }
      }
      
      // Notificar finalización
      if (this.onComplete) {
        this.onComplete(this.results);
      }
      
    } catch (error) {
      console.error('APYSKY: Error al procesar cola de mensajes:', error);
      
      // Notificar error general
      if (this.onError) {
        this.onError({
          error: error.message,
          remaining: this.queue.length
        });
      }
    } finally {
      this.isProcessing = false;
      
      // Reiniciar resultados
      this.results = {
        total: 0,
        sent: 0,
        failed: 0,
        details: []
      };
    }
  }
  
  /**
   * Detiene el procesamiento de la cola
   */
  stop() {
    this.queue = [];
    this.isProcessing = false;
  }
}

// Instancia global de la cola de mensajes
export const messageQueue = new MessageQueue(); 