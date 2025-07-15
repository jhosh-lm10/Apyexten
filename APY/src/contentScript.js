// contentScript.js
// -------------------------------------------
// APYSKY WhatsApp Sender – Content Script
// Implementación simplificada para auto-envío de mensajes
// -------------------------------------------
console.log('APYSKY: Content script cargado');

// Función para esperar a que WAPI esté disponible
function waitForWAPI(ms = 15000) {
  return new Promise((resolve, reject) => {
    if (window.WAPI) return resolve();
    
    const interval = setInterval(() => {
      if (window.WAPI) { 
        clearInterval(interval); 
        resolve(); 
      }
    }, 200);
    
    setTimeout(() => { 
      clearInterval(interval); 
      reject(new Error('WAPI: Tiempo de espera agotado')); 
    }, ms);
  });
}

// Verificar el estado de conexión de WhatsApp Web
function checkConnection() {
  try {
    // Verificar si el usuario está autenticado
    const isAuthenticated = window.Store && 
                          window.Store.State && 
                          window.Store.State.Socket && 
                          window.Store.State.Socket.stream === 'SYNCING';
    
    // Verificar si la interfaz de usuario está cargada
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

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Manejar solicitud de verificación de conexión
  if (request.action === 'CHECK_CONNECTION') {
    try {
      await waitForWAPI();
      const status = checkConnection();
      console.log('APYSKY: Estado de conexión:', status);
      
      if (sendResponse) {
        sendResponse({
          success: true,
          ...status
        });
      }
    } catch (error) {
      console.error('APYSKY: Error al verificar la conexión:', error);
      
      if (sendResponse) {
        sendResponse({
          success: false,
          isConnected: false,
          error: error.message || 'Error al verificar la conexión',
          lastChecked: new Date().toISOString()
        });
      }
    }
    return true;
  }
  
  // Manejar solicitud de envío de mensaje
  if (request.action === 'wapiSend') {
    console.log('APYSKY: Recibida solicitud para enviar mensaje vía WAPI');
    
    try {
      // Verificar la conexión primero
      const connectionStatus = checkConnection();
      if (!connectionStatus.isConnected) {
        throw new Error('No hay conexión con WhatsApp Web. Por favor, verifica que hayas iniciado sesión.');
      }
      
      // Esperar a que WAPI esté disponible
      await waitForWAPI();
      
      // Enviar el mensaje usando WAPI
      await window.WAPI.sendMessage(request.jid, request.text);
      console.log('APYSKY: Mensaje enviado con éxito a', request.jid);
      
      // Responder con éxito
      if (sendResponse) {
        sendResponse({ 
          success: true,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('APYSKY: Error al enviar mensaje con WAPI:', error);
      
      // Responder con error
      if (sendResponse) {
        sendResponse({ 
          success: false, 
          error: error.message || 'Error desconocido al enviar el mensaje',
          timestamp: new Date().toISOString()
        });
      }
    }
    return true;
  }
  
  // Para cualquier otro tipo de mensaje, no hacemos nada
  return false;
});

// Iniciar el script cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {});
} else {
  // Si el documento ya está cargado, ejecutar directamente
  {}
}

console.log('APYSKY: Content script completamente inicializado');
