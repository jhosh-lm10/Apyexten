// Content Script para la extensión Apysky
console.log('APYSKY: Content Script cargado en WhatsApp Web');

// Función para verificar si estamos en la página de chat de WhatsApp Web
function isChatOpen() {
  return document.querySelector('div[data-testid="conversation-panel-wrapper"]') !== null;
}

// Función para obtener el número de teléfono del chat actual
function getCurrentChatNumber() {
  const header = document.querySelector('header[data-testid="conversation-header"]');
  if (!header) return null;
  
  // Extraer el número de teléfono del atributo data-id del chat
  const chatPanel = document.querySelector('div[data-testid="conversation-panel-wrapper"]');
  if (!chatPanel) return null;
  
  const chatId = chatPanel.getAttribute('data-id');
  if (!chatId) return null;
  
  // El formato suele ser: "<número>@c.us"
  return chatId.split('@')[0];
}

// Función para enviar un mensaje al chat actual
async function sendMessageToCurrentChat(message, attachment = null) {
  try {
    const chatInput = document.querySelector('div[title="Escribe un mensaje aquí"]');
    if (!chatInput) {
      console.error('APYSKY: No se pudo encontrar el campo de entrada de mensaje');
      return false;
    }

    // Hacer clic en el campo de entrada para enfocarlo
    chatInput.click();
    
    // Establecer el mensaje
    chatInput.textContent = message;
    
    // Disparar eventos de entrada para que WhatsApp detecte el cambio
    const inputEvent = new Event('input', { bubbles: true });
    chatInput.dispatchEvent(inputEvent);
    
    // Enviar el mensaje (simular presionar Enter)
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    });
    
    chatInput.dispatchEvent(enterEvent);
    
    console.log('APYSKY: Mensaje enviado correctamente');
    return true;
  } catch (error) {
    console.error('APYSKY: Error al enviar mensaje:', error);
    return false;
  }
}

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('APYSKY: Mensaje recibido en content script:', request);
  
  if (request.action === 'SEND_MESSAGE') {
    const { message, to } = request.payload;
    
    // Verificar si estamos en el chat correcto
    const currentChat = getCurrentChatNumber();
    const targetChat = to.replace(/[^0-9]/g, ''); // Limpiar el número
    
    if (currentChat && currentChat.includes(targetChat)) {
      // Estamos en el chat correcto, enviar el mensaje
      sendMessageToCurrentChat(message)
        .then(success => {
          sendResponse({ success, error: success ? null : 'No se pudo enviar el mensaje' });
        });
      return true; // Mantener el mensaje abierto para la respuesta asíncrona
    } else {
      // Necesitamos cambiar de chat
      // Esto es más complejo y podría requerir navegación en la interfaz
      sendResponse({ 
        success: false, 
        error: 'No se pudo cambiar al chat de destino. Por favor, abre el chat manualmente.' 
      });
    }
  }
  
  // Para otros tipos de mensajes, responder con un error
  if (request.action) {
    sendResponse({ 
      success: false, 
      error: `Acción no soportada: ${request.action}` 
    });
  }
  
  return true; // Mantener el mensaje abierto para respuestas asíncronas
});

// Notificar que el content script está listo
console.log('APYSKY: Content Script listo');
