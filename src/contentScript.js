/**
 * APYSKY Content Script v4 (UI-Bot-Centric)
 * 
 * Este script es ahora la única pieza que interactúa con la página de WhatsApp.
 * Su única responsabilidad es detectar la página de envío y hacer clic en el botón "Enviar".
 * Abandona por completo la comunicación con un script inyectado.
 */
console.log('APYSKY: Content script cargado (v4 - UI-Bot)');

const SEND_BUTTON_SELECTOR = 'button[aria-label="Enviar"], button[aria-label="Send"]';
const MAX_RETRIES = 20; // 20 reintentos, 500ms cada uno = 10 segundos de espera máxima.
const RETRY_INTERVAL_MS = 500;

/**
 * Función principal que se activa cuando la página de envío de WhatsApp carga.
 * Busca y hace clic en el botón de enviar.
 */
function clickSendButton() {
    let retries = 0;

    console.log('APYSKY: Detectada URL de envío. Iniciando búsqueda del botón de enviar.');

    const intervalId = setInterval(() => {
        const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);

        if (retries >= MAX_RETRIES) {
            clearInterval(intervalId);
            console.error('APYSKY: No se pudo encontrar el botón de enviar después de múltiples intentos. Abortando.');
            chrome.runtime.sendMessage({ action: 'UI_SEND_FAILURE', payload: 'Timeout' });
            return;
        }

        retries++;

        if (sendButton && !sendButton.disabled) {
            console.log(`APYSKY: Botón de enviar encontrado y habilitado después de ${retries} intentos. Haciendo clic.`);
            clearInterval(intervalId);
            sendButton.click();
            // Notificamos al background que el clic se realizó con éxito.
            chrome.runtime.sendMessage({ action: 'UI_SEND_SUCCESS' });
        } else {
            console.log(`APYSKY: Buscando botón de enviar... (Intento ${retries}/${MAX_RETRIES})`);
        }
    }, RETRY_INTERVAL_MS);
}

/**
 * Listener que se activa solo una vez para iniciar la lógica.
 * El content script se inyecta cada vez que la URL coincide.
 */
if (window.location.href.includes('/send?phone=')) {
    // Esperamos un breve momento para que la UI de React se inicialice.
    setTimeout(clickSendButton, 1000);
}

// Mensaje de que el script está listo para futuras comunicaciones si fueran necesarias.
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' });
console.log('APYSKY: Content script listo y esperando URL de envío.');