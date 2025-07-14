// contentScript.js
console.log('APYSKY: Content script cargado');

// Función para esperar que un elemento esté disponible
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Tiempo de espera agotado para el selector: ${selector}`));
        }, timeout);
    });
}

// Función para simular la escritura
async function simulateTyping(element, text) {
    if (!element) {
        console.error('APYSKY: No se puede escribir en un elemento nulo');
        return false;
    }

    try {
        // Enfocar y hacer clic en el campo
        element.focus();
        element.click();
        
        // Limpiar el contenido existente
        element.textContent = '';
        
        // Disparar evento de entrada
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        
        // Establecer el texto directamente (más confiable)
        element.textContent = text;
        
        // Disparar evento de entrada nuevamente
        element.dispatchEvent(inputEvent);
        
        return true;
    } catch (error) {
        console.error('APYSKY: Error al simular escritura:', error);
        return false;
    }
}

// Función para enviar mensaje
async function sendMessageToCurrentChat(phone, message) {
    try {
        console.log('APYSKY: Intentando enviar mensaje a:', phone);
        
        // 1. Abrir la conversación con el número
        const chatUrl = `https://web.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}`;
        window.open(chatUrl, '_blank');
        
        // 2. Esperar a que se cargue el campo de entrada
        const chatInput = await waitForElement('div[contenteditable="true"][data-tab="10"]')
            .catch(err => {
                console.error('APYSKY: Error esperando el campo de entrada:', err);
                return null;
            });
        
        if (!chatInput) {
            console.error('APYSKY: No se pudo encontrar el campo de entrada');
            return false;
        }

        // 3. Escribir el mensaje
        const typingSuccess = await simulateTyping(chatInput, message);
        if (!typingSuccess) {
            console.error('APYSKY: No se pudo escribir el mensaje');
            return false;
        }

        // 4. Enviar el mensaje (usando Enter)
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        
        chatInput.dispatchEvent(enterEvent);
        console.log('APYSKY: Mensaje enviado con éxito');
        return true;
        
    } catch (error) {
        console.error('APYSKY: Error al enviar mensaje:', error);
        return false;
    }
}

// Escuchar mensajes del background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendMessage' && request.phone && request.message) {
        console.log('APYSKY: Recibido mensaje para enviar a:', request.phone);
        
        // Usar una promesa para manejar la respuesta asíncrona
        const promise = sendMessageToCurrentChat(request.phone, request.message);
        
        // Enviar la respuesta cuando la promesa se resuelva
        promise.then(success => {
            sendResponse({ success });
        }).catch(error => {
            console.error('APYSKY: Error en el envío:', error);
            sendResponse({ success: false, error: error.message });
        });
        
        // Devolver true para indicar que la respuesta será asíncrona
        return true;
    }
});

console.log('APYSKY: Content script completamente cargado');