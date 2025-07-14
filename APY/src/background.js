// Background Script para la extensión Apysky
console.log('APYSKY: Background Script cargado');

// Almacenar el estado de la extensión
const state = {
  isConnected: false,
  currentTab: null,
  whatsAppTab: null
};

// Verificar si una URL es de WhatsApp Web
function isWhatsAppWebUrl(url) {
  return url && url.startsWith('https://web.whatsapp.com/');
}

// Encontrar la pestaña de WhatsApp Web abierta
async function findWhatsAppTab() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    return tabs.length > 0 ? tabs[0] : null;
  } catch (error) {
    console.error('APYSKY: Error al buscar pestaña de WhatsApp:', error);
    return null;
  }
}

// Abrir WhatsApp Web en una nueva pestaña
async function openWhatsAppWeb() {
  try {
    console.log('APYSKY: Abriendo WhatsApp Web...');
    const tab = await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
    state.whatsAppTab = tab;
    return tab;
  } catch (error) {
    console.error('APYSKY: Error al abrir WhatsApp Web:', error);
    return null;
  }
}

// Enviar un mensaje a través de WhatsApp Web
async function sendMessage(phoneNumber, message) {
  try {
    // Buscar la pestaña de WhatsApp Web
    let tab = await findWhatsAppTab();
    
    // Si no está abierta, abrir una nueva
    if (!tab) {
      tab = await openWhatsAppWeb();
      if (!tab) {
        throw new Error('No se pudo abrir WhatsApp Web');
      }
    }
    
    // Asegurarse de que la pestaña esté activa
    await chrome.tabs.update(tab.id, { active: true });
    
    // Enviar el mensaje al content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'SEND_MESSAGE',
      payload: {
        to: phoneNumber,
        message: message
      }
    });
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Error desconocido al enviar el mensaje');
    }
    
    return { success: true };
  } catch (error) {
    console.error('APYSKY: Error en sendMessage:', error);
    return { 
      success: false, 
      error: error.message || 'Error al enviar el mensaje' 
    };
  }
}

// Escuchar mensajes del popup o de otras partes de la extensión
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('APYSKY: Mensaje recibido en background:', request);
  
  // Manejar diferentes tipos de acciones
  if (request.action === 'SEND_MESSAGE') {
    const { phoneNumber, message } = request.payload;
    
    // Enviar el mensaje y responder cuando termine
    sendMessage(phoneNumber, message)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message || 'Error al enviar el mensaje' 
      }));
    
    return true; // Mantener el mensaje abierto para la respuesta asíncrona
  }
  
  // Verificar el estado de conexión con WhatsApp Web
  if (request.action === 'CHECK_CONNECTION') {
    findWhatsAppTab()
      .then(tab => {
        const isConnected = !!tab;
        state.isConnected = isConnected;
        sendResponse({ 
          success: true, 
          isConnected,
          tabId: tab?.id
        });
      })
      .catch(error => {
        console.error('APYSKY: Error al verificar conexión:', error);
        sendResponse({ 
          success: false, 
          error: 'Error al verificar la conexión',
          isConnected: false
        });
      });
    
    return true; // Mantener el mensaje abierto para la respuesta asíncrona
  }
  
  // Abrir WhatsApp Web
  if (request.action === 'OPEN_WHATSAPP_WEB') {
    openWhatsAppWeb()
      .then(tab => {
        if (tab) {
          state.isConnected = true;
          state.whatsAppTab = tab;
          sendResponse({ 
            success: true, 
            tabId: tab.id 
          });
        } else {
          throw new Error('No se pudo abrir WhatsApp Web');
        }
      })
      .catch(error => {
        console.error('APYSKY: Error al abrir WhatsApp Web:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Error al abrir WhatsApp Web' 
        });
      });
    
    return true; // Mantener el mensaje abierto para la respuesta asíncrona
  }
  
  // Para otras acciones no manejadas
  sendResponse({ 
    success: false, 
    error: `Acción no soportada: ${request.action}` 
  });
});

// Escuchar cambios en las pestañas
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Verificar si la pestaña actualizada es de WhatsApp Web
  if (isWhatsAppWebUrl(tab.url)) {
    console.log('APYSKY: Pestaña de WhatsApp Web actualizada:', tabId, changeInfo.status);
    
    // Si la pestaña terminó de cargar
    if (changeInfo.status === 'complete') {
      state.isConnected = true;
      state.whatsAppTab = tab;
      
      // Notificar al popup que la conexión está lista
      chrome.runtime.sendMessage({
        action: 'WHATSAPP_CONNECTED',
        tabId: tab.id
      }).catch(() => {
        console.log('APYSKY: No hay listeners para el mensaje WHATSAPP_CONNECTED');
      });
    }
  }
});

// Escuchar cuando se cierra una pestaña
chrome.tabs.onRemoved.addListener((tabId) => {
  if (state.whatsAppTab && state.whatsAppTab.id === tabId) {
    console.log('APYSKY: Pestaña de WhatsApp Web cerrada');
    state.isConnected = false;
    state.whatsAppTab = null;
    
    // Notificar al popup que se perdió la conexión
    chrome.runtime.sendMessage({
      action: 'WHATSAPP_DISCONNECTED'
    }).catch(() => {
      console.log('APYSKY: No hay listeners para el mensaje WHATSAPP_DISCONNECTED');
    });
  }
});

// Inicializar el estado de conexión al cargar el background script
async function init() {
  console.log('APYSKY: Inicializando estado de conexión...');
  const tab = await findWhatsAppTab();
  state.isConnected = !!tab;
  state.whatsAppTab = tab;
  console.log('APYSKY: Estado de conexión inicial:', state);
}

// Inicializar cuando se carga el script
init();

console.log('APYSKY: Background Script listo');
