// background.js - Service Worker de la extensión

// Almacena la pestaña activa de WhatsApp Web

/**
 * Busca una pestaña de WhatsApp Web abierta
 * @param {Function} [callback] - Función de retorno opcional
 * @returns {Promise<chrome.tabs.Tab>}
 */
async function findWhatsAppTab(callback) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    const tab = tabs.length > 0 ? tabs[0] : null;
    if (callback) callback(tab);
    return tab;
  } catch (error) {
    console.error('Error al buscar pestaña de WhatsApp:', error);
    if (callback) callback(null);
    return null;
  }
}

/**
 * Maneja el envío de mensajes usando WAPI
 * @param {Object} request - Datos del mensaje
 * @param {Object} sender - Información del remitente
 * @param {Function} sendResponse - Función para enviar respuesta
 */
function handleSendMessage(request, sender, sendResponse) {
  const phone = (request.phone || '').replace(/\D/g, '');
  const text = (request.message || '').trim();
  const jid = `${phone}@c.us`;

  // Responder de inmediato para mantener el puerto abierto
  sendResponse({ success: true });
  
  // Validar datos
  if (!phone) {
    console.error('Número de teléfono no válido');
    return;
  }
  
  if (!text) {
    console.error('El mensaje no puede estar vacío');
    return;
  }
  
  console.log(`APYSKY: Preparando envío a ${phone}`);
  
  // Preparar el payload para WAPI
  const payload = { action: 'wapiSend', jid, text };
  
  // Función para manejar el envío del mensaje
  const sendWAPIMessage = (tab) => {
    if (!tab) {
      console.error('No se encontró una pestaña de WhatsApp Web');
      return;
    }
    
    // Enviar el mensaje al content script
    chrome.tabs.sendMessage(tab.id, payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error al enviar mensaje a la pestaña:', chrome.runtime.lastError);
      } else if (response && !response.success) {
        console.error('Error al enviar mensaje:', response.error);
      }
    });
  };
  
  // Buscar una pestaña existente o crear una nueva
  findWhatsAppTab((tab) => {
    if (tab) {
      // Usar la pestaña existente
      sendWAPIMessage(tab);
    } else {
      // Crear una nueva pestaña
      chrome.tabs.create(
        { 
          url: 'https://web.whatsapp.com',
          active: false 
        },
        (newTab) => {
          // Esperar a que la pestaña esté completamente cargada
          const onTabUpdated = (tabId, info, updatedTab) => {
            if (tabId === newTab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(onTabUpdated);
              
              // Pequeña espera para asegurar que WAPI esté listo
              setTimeout(() => {
                sendWAPIMessage(updatedTab);
              }, 2000);
            }
          };
          
          chrome.tabs.onUpdated.addListener(onTabUpdated);
        }
      );
    }
  });
  const waURL = `https://web.whatsapp.com/send?phone=${phone}` +
                `&text=${encodeURIComponent(text || '')}` +
                '&type=phone_number&app_absent=0';
  
  // Responder de inmediato para evitar el error de puerto cerrado
  console.log('APYSKY: Enviando respuesta inmediata al popup');
  sendResponse({ success: true });
  
  // Buscar pestaña existente de WhatsApp
  findWhatsAppTab((tab) => {
    if (tab) {
      // Si existe, actualizarla
      console.log('APYSKY: Actualizando pestaña existente de WhatsApp');
      chrome.tabs.update(tab.id, { url: waURL, active: false });
    } else {
      // Si no existe, crear una nueva
      console.log('APYSKY: Creando nueva pestaña de WhatsApp');
      chrome.tabs.create({ url: waURL, active: false });
    }
  });
  
  // No retornamos nada ya que ya respondimos con sendResponse
}

console.log('APYSKY: Service Worker iniciado correctamente');

// Manejar mensajes de la interfaz de usuario
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SEND_MESSAGE') {
    handleSendMessage(request, sender, sendResponse);
    return true; // Mantener el mensaje abierto para la respuesta asíncrona
  } else if (request.action === 'CHECK_WHATSAPP_CONNECTION') {
    checkWhatsAppConnection(sendResponse);
    return true; // Mantener el mensaje abierto para la respuesta asíncrona
  }
});

/**
 * Verifica la conexión con WhatsApp Web
 * @param {Function} [callback] - Función de retorno opcional
 * @returns {Promise<{isConnected: boolean, tabId?: number, error?: string}>}
 */
async function checkWhatsAppConnection(callback) {
  try {
    const tab = await findWhatsAppTab();
    
    if (!tab) {
      const response = { isConnected: false, error: 'No se encontró una pestaña de WhatsApp Web abierta' };
      if (callback) callback(response);
      return response;
    }
    
    // Verificar si la pestaña está cargada
    if (tab.status !== 'complete') {
      const response = { 
        isConnected: false, 
        tabId: tab.id,
        error: 'WhatsApp Web está cargando, por favor espere' 
      };
      if (callback) callback(response);
      return response;
    }
    
    // Enviar mensaje al content script para verificar la conexión
    try {
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'CHECK_CONNECTION' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ 
              isConnected: false, 
              tabId: tab.id,
              error: chrome.runtime.lastError.message 
            });
          } else {
            resolve(response || { 
              isConnected: false, 
              tabId: tab.id,
              error: 'No se pudo verificar la conexión' 
            });
          }
        });
      });
      
      if (callback) callback(response);
      return { ...response, tabId: tab.id };
    } catch (error) {
      console.error('Error al verificar la conexión:', error);
      const response = { 
        isConnected: false, 
        tabId: tab.id,
        error: 'Error al verificar la conexión: ' + error.message 
      };
      if (callback) callback(response);
      return response;
    }
  } catch (error) {
    console.error('Error en checkWhatsAppConnection:', error);
    const response = { 
      isConnected: false, 
      error: 'Error inesperado: ' + error.message 
    };
    if (callback) callback(response);
    return response;
  }
}
