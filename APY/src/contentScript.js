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
    
    if (request.action === 'SEND_MESSAGE' || request.action === 'wapiSend') {
      const { phoneNumber, message } =
        request.payload || { phoneNumber: request.jid, message: request.text };
      sendMessage(phoneNumber, message)
        .then(result => sendResponse({ ...result, success: true }))
        .catch(error =>
          sendResponse({
            success: false,
            error: error.message || 'Error desconocido al enviar el mensaje',
            timestamp: new Date().toISOString()
          })
        );
      return true;
    }

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
  let debounceTimer;
  state.observer = new MutationObserver(() => {
    // Ejecutar con debounce para evitar spam de eventos de WhatsApp
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkWhatsAppStatus();
    }, 300); // 300 ms entre chequeos
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

  // Nuevos selectores para diferentes versiones de la UI
  const UI_SELECTORS = [
    'div[data-testid="chat-list"]',        // UI clásica
    'div[id="pane-side"]',                 // UI junio-2024+
    'div[role="grid"]'                     // Otra variante accesible
  ];

  const isUILoaded = UI_SELECTORS.some(sel => document.querySelector(sel));
  
  if (isUILoaded) {
    console.log('APYSKY: Interfaz de WhatsApp detectada');
    // Detener observador para reducir carga
    if (state.observer) state.observer.disconnect();
    loadWAPI();
  } else if (state.initRetries < CONFIG.MAX_RETRIES * 3) { // dar más tiempo a la nueva UI
    state.initRetries++;
    console.log(`APYSKY: Esperando interfaz de WhatsApp (intento ${state.initRetries}/${CONFIG.MAX_RETRIES})`);
    setTimeout(checkWhatsAppStatus, CONFIG.CHECK_INTERVAL);
  } else {
    console.error('APYSKY: No se pudo cargar la interfaz de WhatsApp después de varios intentos');
    if (state.observer) state.observer.disconnect();
  }
}

/**
 * Carga dinámicamente WAPI
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

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('wapi-loader.js');

    let checkInterval;
    let timeout;

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeout) clearTimeout(timeout);
    };

    script.onload = () => {
      console.log('APYSKY: wapi-loader.js cargado correctamente');

      timeout = setTimeout(() => {
        cleanup();
        if (!state.isWAPILoaded) {
          const error = new Error('Tiempo de espera agotado al cargar WAPI');
          console.error('APYSKY:', error.message);
          reject(error);
        }
      }, CONFIG.WAPI_TIMEOUT);

      checkInterval = setInterval(() => {
        try {
          if (window.WAPI) {
            cleanup();
            state.isWAPILoaded = true;
            console.log('APYSKY: WAPI cargado y listo para usar');

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
      }, 500);
    };

    // Insertar el script para comenzar a cargarlo
    (document.head || document.documentElement).appendChild(script);

    script.onerror = (error) => {
      cleanup();
      console.error('APYSKY: Error al cargar wapi-loader.js:', error);
      reject(new Error(`No se pudo cargar wapi-loader.js: ${error.message || 'Error desconocido'}`));
    };
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
    if (window.WAPI) {
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
 * Envía un mensaje usando WAPI asegurando su carga previa
 * @param {string} phoneNumber
 * @param {string} message
 */
async function sendMessage(phoneNumber, message) {
  if (!state.isWAPILoaded) {
    await loadWAPI();
  }

  if (!window.WAPI) {
    throw new Error('WAPI no está disponible');
  }

  const result = await window.WAPI.sendMessage(phoneNumber, message);
  return {
    message: 'Mensaje enviado correctamente',
    timestamp: new Date().toISOString(),
    messageId: result.id
  };
}


console.log('APYSKY: Content script completamente inicializado');
