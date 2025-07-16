// contentScript.js
// -------------------------------------------
// APYSKY WhatsApp Sender – Content Script
// Implementación mejorada con MutationObserver
// -------------------------------------------
console.log('APYSKY: Content script cargado');

// Configuración
const CONFIG = {
  WAPI_TIMEOUT: 30000, // 30 segundos
  CHECK_INTERVAL: 1000, // 1 segundo
  MAX_RETRIES: 10
};

// Estado de la extensión
const state = {
  isWAPILoaded: false,
  isWhatsAppReady: false,
  observer: null,
  initRetries: 0
};

/**
 * Inicializa el MutationObserver para detectar cambios en el DOM
 */
function initMutationObserver() {
  if (state.observer) return;

  state.observer = new MutationObserver((mutations) => {
    // Verificar si WhatsApp Web está listo cuando se detecten cambios en el DOM
    checkWhatsAppStatus();
  });

  // Observar cambios en el body y sus descendientes
  state.observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  console.log('APYSKY: MutationObserver inicializado');
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
 */
async function loadWAPI() {
  if (state.isWAPILoaded) return;

  return new Promise((resolve, reject) => {
    if (window.WAPI) {
      state.isWAPILoaded = true;
      return resolve();
    }

    // Cargar wapi-loader.js
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('wapi-loader.js');
    script.onload = () => {
      console.log('APYSKY: wapi-loader.js cargado');
      
      // Verificar periódicamente si WAPI está disponible
      const checkInterval = setInterval(() => {
        if (window.WAPI) {
          clearInterval(checkInterval);
          state.isWAPILoaded = true;
          console.log('APYSKY: WAPI cargado correctamente');
          resolve();
        }
        
        if (state.initRetries++ > CONFIG.MAX_RETRIES) {
          clearInterval(checkInterval);
          reject(new Error('Tiempo de espera agotado para cargar WAPI'));
        }
      }, 1000);
    };
    
    script.onerror = (error) => {
      console.error('APYSKY: Error al cargar wapi-loader.js:', error);
      reject(new Error('No se pudo cargar wapi-loader.js'));
    };
    
    (document.head || document.documentElement).appendChild(script);
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

// Inicializar el MutationObserver cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMutationObserver);
} else {
  initMutationObserver();
}

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Manejar solicitud de verificación de conexión
  if (request.action === 'CHECK_CONNECTION') {
    try {
      const connectionStatus = checkConnection();
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
    return true; // Indica que la respuesta será asíncrona
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
