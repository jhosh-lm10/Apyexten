// contentScript.js
// -------------------------------------------
// APYSKY WhatsApp Sender – Content Script
// Versión optimizada para inyección confiable
// -------------------------------------------

// Estado global
const state = {
  isWAPILoaded: false,
  isWhatsAppReady: false,
  observer: null,
  initRetries: 0
};

// Configuración
const CONFIG = {
  WAPI_TIMEOUT: 30000, // 30 segundos
  CHECK_INTERVAL: 1000, // 1 segundo
  MAX_RETRIES: 10
};

// Verificar si estamos en WhatsApp Web
if (window.location.hostname === 'web.whatsapp.com') {
  initializeContentScript();
}

// Inicialización del content script
function initializeContentScript() {
  console.log('APYSKY: Inicializando content script en WhatsApp Web');
  
  // Configurar el MutationObserver
  setupMutationObserver();
  
  // Verificar estado inicial
  checkWhatsAppStatus();
  
  // Configurar el manejador de mensajes
  setupMessageHandler();
  
  // Notificar al background que estamos listos
  notifyBackgroundReady();
}

// Configurar el manejador de mensajes
function setupMessageHandler() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('APYSKY: Mensaje recibido:', request.action);
    
    // Manejar solicitud de verificación de conexión
    if (request.action === 'CHECK_CONNECTION') {
      try {
        const connectionStatus = checkConnection();
        console.log('APYSKY: Estado de conexión:', connectionStatus);
        sendResponse({
          success: true,
          ...connectionStatus,
          isWAPILoaded: state.isWAPILoaded,
          isWhatsAppReady: state.isWhatsAppReady
        });
      } catch (error) {
        console.error('APYSKY: Error al verificar conexión:', error);
        sendResponse({
          success: false,
          error: error.message,
          isConnected: false,
          isAuthenticated: false,
          isUILoaded: false,
          isWAPILoaded: state.isWAPILoaded,
          isWhatsAppReady: state.isWhatsAppReady
        });
      }
      return true; // Respuesta asíncrona
    }
    
    // Otros manejadores de mensajes pueden ir aquí
    return false;
  });
}

// Notificar al background que el content script está listo
function notifyBackgroundReady() {
  chrome.runtime.sendMessage(
    { action: 'CONTENT_SCRIPT_READY' },
    (response) => {
      if (chrome.runtime.lastError) {
        console.log('APYSKY: Error al notificar al background:', chrome.runtime.lastError);
        // Reintentar después de un tiempo si falla
        setTimeout(notifyBackgroundReady, 1000);
      } else if (response?.status === 'ready') {
        console.log('APYSKY: Background listo, comunicación establecida');
      }
    }
  );
}

/**
 * Configura el MutationObserver para detectar cambios en el DOM
 */
function setupMutationObserver() {
  // Si ya hay un observador, desconectarlo primero
  if (state.observer) {
    state.observer.disconnect();
  }

  // Configurar el observador para detectar cambios en el DOM
  state.observer = new MutationObserver((mutations) => {
    // Verificar si WhatsApp está listo cuando se detecten cambios
    checkWhatsAppStatus();
  });

  // Comenzar a observar cambios en el documento
  state.observer.observe(document, {
    childList: true,
    subtree: true
  });

  console.log('APYSKY: MutationObserver configurado');
}

/**
 * Verifica el estado de WhatsApp y carga WAPI si es necesario
 */
function checkWhatsAppStatus() {
  // Verificar si ya está listo
  if (state.isWhatsAppReady) {
    return;
  }

  // Verificar si el DOM de WhatsApp está listo
  const isUILoaded = document.querySelector('div[data-testid="chat-list"]') !== null;
  
  if (isUILoaded) {
    console.log('APYSKY: Interfaz de WhatsApp detectada');
    loadWAPI();
  } else if (state.initRetries < CONFIG.MAX_RETRIES) {
    state.initRetries++;
    console.log(`APYSKY: Esperando interfaz de WhatsApp (intento ${state.initRetries}/${CONFIG.MAX_RETRIES})`);
    setTimeout(checkWhatsAppStatus, CONFIG.CHECK_INTERVAL);
  } else {
    console.error('APYSKY: No se pudo cargar la interfaz de WhatsApp después de varios intentos');
  }
}

/**
 * Carga dinámicamente WAPI
 */
function loadWAPI() {
  if (state.isWAPILoaded) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log('APYSKY: Cargando WAPI...');
    
    // Crear script para cargar WAPI
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('wapi-loader.js');
    script.onload = () => {
      console.log('APYSKY: WAPI cargado correctamente');
      state.isWAPILoaded = true;
      verifyWhatsAppReady();
      resolve();
    };
    script.onerror = (error) => {
      console.error('APYSKY: Error al cargar WAPI:', error);
      reject(new Error('No se pudo cargar WAPI'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Verifica si WhatsApp está listo para usarse
 */
function verifyWhatsAppReady() {
  if (state.isWhatsAppReady) {
    return;
  }

  try {
    // Verificar si WAPI está disponible
    if (window.WAPI && window.WAPI.isLoggedIn()) {
      console.log('APYSKY: WhatsApp Web está listo');
      state.isWhatsAppReady = true;
      notifyBackgroundReady();
    } else if (state.initRetries < CONFIG.MAX_RETRIES) {
      state.initRetries++;
      console.log(`APYSKY: Esperando autenticación de WhatsApp (intento ${state.initRetries}/${CONFIG.MAX_RETRIES})`);
      setTimeout(verifyWhatsAppReady, CONFIG.CHECK_INTERVAL);
    } else {
      console.error('APYSKY: No se pudo verificar el estado de WhatsApp después de varios intentos');
    }
  } catch (error) {
    console.error('APYSKY: Error al verificar estado de WhatsApp:', error);
    
    if (state.initRetries < CONFIG.MAX_RETRIES) {
      state.initRetries++;
      setTimeout(verifyWhatsAppReady, CONFIG.CHECK_INTERVAL);
    }
  }
}

/**
 * Verifica el estado de la conexión con WhatsApp Web
 * @returns {Object} Estado de la conexión
 */
function checkConnection() {
  try {
    const isAuthenticated = window.WAPI && 
                         window.WAPI.isLoggedIn && 
                         window.WAPI.isLoggedIn();
    
    const isUILoaded = document.querySelector('div[data-testid="chat-list"]') !== null;
    
    return {
      isConnected: isAuthenticated && isUILoaded,
      isAuthenticated,
      isUILoaded,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    console.error('APYSKY: Error al verificar la conexión:', error);
    return {
      isConnected: false,
      isAuthenticated: false,
      isUILoaded: false,
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}


/**
 * Verifica si WhatsApp Web está listo y carga WAPI si es necesario
 */
async function checkWhatsAppStatus() {
  if (state.isWhatsAppReady) return;

  try {
    const isLoaded = document.querySelector('div[data-testid="chat-list"]') !== null;
    
    if (isLoaded) {
      console.log('APYSKY: WhatsApp Web detectado, cargando WAPI...');
      await loadWAPI();
      state.isWhatsAppReady = true;
      console.log('APYSKY: WhatsApp Web listo');
      
      // Notificar al background script que WhatsApp está listo
      chrome.runtime.sendMessage({ 
        action: 'WHATSAPP_READY',
        status: true 
      });
    }
  } catch (error) {
    console.error('APYSKY: Error al verificar estado de WhatsApp:', error);
  }
}

/**
 * Carga dinámicamente WAPI
 * @returns {Promise<void>}
 */
async function loadWAPI() {
  if (state.isWAPILoaded) {
    console.log('APYSKY: WAPI ya está cargado');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Verificar si WAPI ya está disponible
    if (window.WAPI) {
      console.log('APYSKY: WAPI ya está disponible globalmente');
      state.isWAPILoaded = true;
      return resolve();
    }

    console.log('APYSKY: Iniciando carga de WAPI...');

    // Crear y configurar el script para cargar wapi-loader.js
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('wapi-loader.js');
    script.onerror = (error) => {
      console.error('APYSKY: Error al cargar wapi-loader.js:', error);
      reject(new Error('No se pudo cargar wapi-loader.js'));
    };

    script.onload = () => {
      console.log('APYSKY: wapi-loader.js cargado correctamente');
      
      let checkInterval;
      let timeout;
      
      // Función para limpiar recursos
      const cleanup = () => {
        if (checkInterval) clearInterval(checkInterval);
        if (timeout) clearTimeout(timeout);
      };
      
      // Configurar un timeout para la carga de WAPI
      timeout = setTimeout(() => {
        cleanup();
        if (!state.isWAPILoaded) {
          const error = new Error('Tiempo de espera agotado al cargar WAPI');
          console.error('APYSKY:', error.message);
          reject(error);
        }
      }, CONFIG.WAPI_TIMEOUT);
      
      // Verificar periódicamente si WAPI está disponible
      checkInterval = setInterval(() => {
        try {
          if (window.WAPI && window.WAPI.isReady) {
            cleanup();
            state.isWAPILoaded = true;
            console.log('APYSKY: WAPI cargado y listo para usar');
            
            // Notificar al background que WAPI está listo
            chrome.runtime.sendMessage({
              action: 'WAPI_READY',
              status: true
            }).catch(error => {
              console.error('APYSKY: Error al notificar que WAPI está listo:', error);
            });
            
            resolve();
          }
        } catch (error) {
          console.error('APYSKY: Error al verificar estado de WAPI:', error);
          cleanup();
          reject(error);
        }
      }, 500); // Verificar cada 500ms
      
      // Agregar el script al documento
      (document.head || document.documentElement).appendChild(script);
    };
    
    // Manejar errores de carga del script
    script.onerror = (error) => {
      cleanup();
      console.error('APYSKY: Error al cargar wapi-loader.js:', error);
      reject(new Error(`No se pudo cargar wapi-loader.js: ${error.message || 'Error desconocido'}`));
    };
  });
}

/**
 * Verifica el estado de la conexión con WhatsApp Web
 */
function checkConnection() {
  try {
    const isAuthenticated = window.Store && 
                         window.Store.State && 
                         window.Store.State.Socket && 
                         window.Store.State.Socket.stream === 'SYNCING';
    
    const isUILoaded = document.querySelector('div[data-testid="chat-list"]') !== null;
    
    return {
      isConnected: isAuthenticated && isUILoaded,
      isAuthenticated,
      isUILoaded,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    console.error('APYSKY: Error al verificar la conexión:', error);
    return {
      isConnected: false,
      isAuthenticated: false,
      isUILoaded: false,
      error: error.message
    };
  }
}

// Función para inicializar el content script
function initializeContentScript() {
  console.log('APYSKY: Inicializando content script...');
  
  // Verificar si estamos en la página correcta
  if (!window.location.href.includes('web.whatsapp.com')) {
    console.log('APYSKY: No es la página de WhatsApp Web');
    return;
  }
  
  // Inicializar el MutationObserver
  initMutationObserver();
  
  // Notificar al background que estamos listos
  notifyBackgroundReady();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('APYSKY: Mensaje recibido en el content script:', request.action);
  
  // Manejar solicitud de verificación de conexión
  if (request.action === 'CHECK_CONNECTION') {
    console.log('APYSKY: Verificando estado de conexión...');
    
    // Usar un try-catch para manejar cualquier error inesperado
    try {
      const connectionStatus = checkConnection();
      console.log('APYSKY: Estado de conexión:', connectionStatus);
      
      const response = { 
        success: true, 
        ...connectionStatus,
        isWAPILoaded: state.isWAPILoaded,
        isWhatsAppReady: state.isWhatsAppReady,
        timestamp: new Date().toISOString()
      };
      
      console.log('APYSKY: Enviando respuesta al background:', response);
      sendResponse(response);
    } catch (error) {
      console.error('APYSKY: Error al verificar conexión:', error);
      
      const errorResponse = { 
        success: false, 
        error: error.message || 'Error desconocido al verificar la conexión',
        isConnected: false,
        isAuthenticated: false,
        isUILoaded: false,
        isWAPILoaded: state.isWAPILoaded,
        isWhatsAppReady: state.isWhatsAppReady,
        timestamp: new Date().toISOString()
      };
      
      console.error('APYSKY: Enviando respuesta de error al background:', errorResponse);
      sendResponse(errorResponse);
    }
    
    // Devolver true para indicar que la respuesta será asíncrona
    return true;
  }

  // Manejar solicitud de envío de mensaje
  if (request.action === 'SEND_MESSAGE') {
    const { phoneNumber, message } = request.payload;
    console.log('APYSKY: Recibida solicitud para enviar mensaje a:', phoneNumber);
    
    const sendMessage = async () => {
      try {
        // Esperar a que WAPI esté disponible
        if (!state.isWAPILoaded) {
          await loadWAPI();
        }
        
        // Validar que WAPI esté disponible
        if (!window.WAPI) {
          throw new Error('WAPI no está disponible');
        }
        
        // Enviar el mensaje usando WAPI
        const result = await window.WAPI.sendMessage(phoneNumber, message);
        
        console.log('APYSKY: Mensaje enviado con éxito:', result);
        
        return { 
          success: true, 
          message: 'Mensaje enviado correctamente',
          timestamp: new Date().toISOString(),
          messageId: result.id
        };
      } catch (error) {
        console.error('APYSKY: Error al enviar mensaje con WAPI:', error);
        throw error;
      }
    };
    
    // Ejecutar el envío y enviar la respuesta
    sendMessage()
      .then(result => sendResponse({ ...result, success: true }))
      .catch(error => sendResponse({
        success: false, 
        error: error.message || 'Error desconocido al enviar el mensaje',
        timestamp: new Date().toISOString()
      }));
      
    return true; // Indica que la respuesta será asíncrona
  }
  
  // Para cualquier otro tipo de mensaje, no hacemos nada
  return false;
});

console.log('APYSKY: Content script completamente inicializado');
