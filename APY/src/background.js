// background.js - Service Worker de la extensión

// Estado global para almacenar la pestaña activa de WhatsApp Web
let whatsappTab = null;

/**
 * Busca una pestaña de WhatsApp Web abierta
 * @returns {Promise<chrome.tabs.Tab>}
 */
async function findWhatsAppTab() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    whatsappTab = tabs.length > 0 ? tabs[0] : null;
    return whatsappTab;
  } catch (error) {
    console.error('Error al buscar pestaña de WhatsApp:', error);
    whatsappTab = null;
    return null;
  }
}


/**
 * Maneja el envío de mensajes usando WAPI
 * @param {Object} request - Datos del mensaje
 * @param {Object} sender - Información del remitente
 * @param {Function} sendResponse - Función para enviar respuesta
 * @returns {boolean} - true si la respuesta será asíncrona
 */
function handleSendMessage(request, sender, sendResponse) {
  // Validar datos
  const phone = (request.phone || '').replace(/\D/g, '');
  const text = (request.message || '').trim();
  
  if (!phone) {
    sendResponse({ 
      success: false, 
      error: 'Número de teléfono no válido' 
    });
    return false;
  }
  
  if (!text) {
    sendResponse({ 
      success: false, 
      error: 'El mensaje no puede estar vacío' 
    });
    return false;
  }
  
  console.log(`APYSKY: Preparando envío a ${phone}`);
  
  // Preparar el payload para el content script
  const jid = `${phone}@c.us`;
  const payload = {
    action: 'SEND_MESSAGE',
    payload: {
      phoneNumber: jid,
      message: text
    }
  };
  
  // Función para manejar el envío del mensaje
  const sendWAPIMessage = (tab) => {
    if (!tab) {
      console.error('No se encontró una pestaña de WhatsApp Web');
      return;
    }
    
    const MAX_RETRIES = 5;
    let attempts = 0;

    const attemptSend = () => {
      chrome.tabs.sendMessage(tab.id, payload, (response) => {
        if (chrome.runtime.lastError) {
          // Si no existe el content script aún, reintentar
          if (chrome.runtime.lastError.message.includes('Could not establish connection') && attempts < MAX_RETRIES) {
            attempts++;
            console.warn(`Retry ${attempts}/${MAX_RETRIES} – Content script aún no disponible, reintentando...`);
            return setTimeout(attemptSend, 1000);
          }
          console.error('Error al enviar mensaje a la pestaña:', chrome.runtime.lastError);
        } else if (response && !response.success) {
          console.error('Error al enviar mensaje:', response.error);
        }
      });
    };

    attemptSend();
  };
  
  // Buscar una pestaña existente o crear una nueva
  findWhatsAppTab().then((tab) => {
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
  findWhatsAppTab().then((tab) => {
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

// Mapa para mantener el estado de las pestañas de WhatsApp
const whatsappTabs = new Map();

// Inicializar buscando la pestaña de WhatsApp
findWhatsAppTab().then(tab => {
  console.log('APYSKY: Pestaña de WhatsApp encontrada:', tab ? tab.id : 'No encontrada');
});

// Escuchar cambios en las pestañas para actualizar la referencia
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('web.whatsapp.com')) {
    whatsappTab = tab;
    // Notificar al content script que el background está listo
    try {
      chrome.tabs.sendMessage(tabId, { action: 'BACKGROUND_READY' });
    } catch (error) {
      console.log('APYSKY: Aún no se puede enviar mensaje al content script:', error);
    }
  }
});

// Manejar mensajes de los content scripts y la interfaz de usuario
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Manejar mensaje de content script listo
  if (request.action === 'CONTENT_SCRIPT_READY') {
    console.log('APYSKY: Content script listo en la pestaña:', sender.tab?.id);
    if (sender.tab?.id) {
      whatsappTabs.set(sender.tab.id, true);
      // Responder que el background está listo
      sendResponse({ status: 'ready' });
    }
    return true; // Mantener el puerto abierto para respuesta asíncrona
  }
  console.log('Mensaje recibido en el service worker:', request.action);
  
  // Manejar solicitud de verificación de conexión
  if (request.action === 'CHECK_WHATSAPP_CONNECTION') {
    checkWhatsAppConnection()
      .then(result => sendResponse(result))
      .catch(error => ({
        isConnected: false,
        error: 'Error al verificar conexión: ' + error.message
      }));
    return true; // Indica que la respuesta será asíncrona
  }

  // Manejar solicitud de envío de mensaje
  if (request.action === 'SEND_MESSAGE') {
    handleSendMessage(request, sender, sendResponse);
    return true; // Indica que la respuesta será asíncrona
  }
  
  // Manejar notificación de WhatsApp listo
  if (request.action === 'WHATSAPP_READY') {
    console.log('APYSKY: WhatsApp Web está listo');
    sendResponse({ success: true });
    return true;
  }
});

/**
 * Espera a que el content script de la pestaña indicada envíe CONTENT_SCRIPT_READY.
 * @param {number} tabId
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<void>}
 */
function waitForContentScript(tabId, timeoutMs = 10000) {
  // Si ya está registrado como listo, no esperar
  if (whatsappTabs.get(tabId)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const start = Date.now();

    const interval = setInterval(() => {
      if (whatsappTabs.get(tabId)) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Content script no respondió en el tiempo esperado'));
      }
    }, 500);
  });
}

/**
 * Inyecta manualmente contentScript.js en la pestaña indicada
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['contentScript.js']
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error('APYSKY: Error al inyectar content script:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('APYSKY: contentScript.js inyectado manualmente');
          resolve();
        }
      }
    );
  });
}

/**
 * Verifica la conexión con WhatsApp Web
 * @param {Function} [callback] - Función de retorno opcional
 * @returns {Promise<{isConnected: boolean, tabId?: number, error?: string}>}
 */
async function checkWhatsAppConnection(callback) {
  try {
    console.log('APYSKY: Verificando conexión con WhatsApp Web...');
    const tab = await findWhatsAppTab();
    
    if (!tab) {
      const errorMsg = 'No se encontró una pestaña de WhatsApp Web abierta';
      console.log('APYSKY:', errorMsg);
      const response = { 
        isConnected: false, 
        error: errorMsg 
      };
      if (callback) callback(response);
      return response;
    }
    
    console.log('APYSKY: Pestaña de WhatsApp encontrada, ID:', tab.id);
    
    // Verificar si la pestaña está cargada
    if (tab.status !== 'complete') {
      const loadingMsg = 'WhatsApp Web está cargando, por favor espere';
      console.log('APYSKY:', loadingMsg);
      const response = { 
        isConnected: false, 
        tabId: tab.id,
        error: loadingMsg 
      };
      if (callback) callback(response);
      return response;
    }
    
    console.log('APYSKY: Esperando a que el content script esté listo...');

    try {
      await waitForContentScript(tab.id, 10000);
    } catch (waitErr) {
      console.warn('APYSKY: El content script no respondió a tiempo, intentando inyectar manualmente...');
      try {
        await injectContentScript(tab.id);
        // esperar de nuevo brevemente
        await waitForContentScript(tab.id, 5000);
      } catch (injErr) {
        console.error('APYSKY: No se pudo inyectar el content script:', injErr);
        const resp = { isConnected: false, tabId: tab.id, error: 'No se pudo inyectar el content script' };
        if (callback) callback(resp);
        return resp;
      }
    }

    console.log('APYSKY: Enviando mensaje de verificación a la pestaña...');

    // Enviar mensaje al content script para verificar la conexión
    try {
      const response = await new Promise((resolve) => {
        // Agregar un timeout para evitar esperar indefinidamente
        const timeout = setTimeout(() => {
          resolve({ 
            isConnected: false, 
            tabId: tab.id,
            error: 'Tiempo de espera agotado al verificar la conexión' 
          });
        }, 5000); // 5 segundos de timeout

        chrome.tabs.sendMessage(tab.id, { action: 'CHECK_CONNECTION' }, (response) => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            console.error('APYSKY: Error al enviar mensaje al content script:', chrome.runtime.lastError);
            resolve({ 
              isConnected: false, 
              tabId: tab.id,
              error: 'No se pudo comunicar con el content script: ' + chrome.runtime.lastError.message 
            });
          } else if (!response) {
            console.error('APYSKY: No se recibió respuesta del content script');
            resolve({ 
              isConnected: false, 
              tabId: tab.id,
              error: 'No se recibió respuesta del content script' 
            });
          } else {
            console.log('APYSKY: Respuesta del content script:', response);
            resolve(response);
          }
        });
      });
      
      if (callback) callback(response);
      return { ...response, tabId: tab.id };
    } catch (error) {
      console.error('APYSKY: Error al verificar la conexión:', error);
      const response = { 
        isConnected: false, 
        tabId: tab.id,
        error: 'Error al verificar la conexión: ' + (error.message || 'Error desconocido')
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
