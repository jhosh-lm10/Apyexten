/**
 * APYSKY - Background Script
 * 
 * Este script se ejecuta en segundo plano y gestiona la comunicación
 * entre el popup y el content script, así como el procesamiento de
 * mensajes programados.
 */

console.log('APYSKY: Background Script v4 (UI-Bot-Centric) cargado');

const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/';

// Almacena el estado global
const state = {
    whatsappTabId: null,
    isWhatsAppReady: false,
    messageQueue: [],
    currentSendingPromise: null,
};

// ------------------- INICIALIZACIÓN Y GESTIÓN DE PESTAÑA -------------------

async function getOrCreateWhatsAppTab() {
    const tabs = await chrome.tabs.query({ url: `${WHATSAPP_WEB_URL}*` });
    if (tabs.length > 0) {
        console.log('APYSKY: Pestaña de WhatsApp Web encontrada:', tabs[0].id);
        state.whatsappTabId = tabs[0].id;
        return tabs[0];
    }
    console.log('APYSKY: No se encontró pestaña de WhatsApp Web. Creando una nueva.');
    const tab = await chrome.tabs.create({ url: WHATSAPP_WEB_URL });
    state.whatsappTabId = tab.id;
    return tab;
}


// ------------------- LÓGICA DE ENVÍO DE MENSAJES (UI-BOT) -------------------

async function sendMessage(to, message) {
    console.log(`APYSKY: Preparando envío de mensaje (UI) a: ${to}`);
    
    // El mensaje ya viene limpio desde el popup.
    const encodedMessage = encodeURIComponent(message);

    const tab = await getOrCreateWhatsAppTab();
    const url = `${WHATSAPP_WEB_URL}send?phone=${to}&text=${encodedMessage}`;
    
    console.log(`APYSKY: Navegando a la URL de envío en la pestaña ${tab.id}`);

    return new Promise((resolve, reject) => {
        // Guardamos las funciones de resolución para usarlas en el listener.
        state.currentSendingPromise = { resolve, reject };

        // Creamos un timeout para no esperar indefinidamente.
        const timeoutId = setTimeout(() => {
            if (state.currentSendingPromise) {
                console.error('APYSKY: Timeout esperando la confirmación del content script.');
                state.currentSendingPromise.reject(new Error('Timeout esperando confirmación del envío por UI'));
                state.currentSendingPromise = null;
            }
        }, 15000); // 15 segundos de timeout

        // El listener se encargará de resolver esta promesa.
        chrome.tabs.update(tab.id, { url: url, active: true }, () => {
             console.log("APYSKY: Actualización de pestaña completada.");
        });
    });
}


// ------------------- LISTENERS DE MENSAJES -------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('APYSKY: Mensaje recibido en background:', request);

    switch (request.action) {
        case 'SEND_MESSAGE':
            sendMessage(request.payload.to, request.payload.message)
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Indicar respuesta asíncrona.

        case 'UI_SEND_SUCCESS':
            if (state.currentSendingPromise) {
                console.log("APYSKY: Recibido UI_SEND_SUCCESS del content script.");
                state.currentSendingPromise.resolve("Mensaje enviado con éxito por UI.");
                state.currentSendingPromise = null;
            }
            break;

        case 'UI_SEND_FAILURE':
            if (state.currentSendingPromise) {
                console.error("APYSKY: Recibido UI_SEND_FAILURE del content script:", request.payload);
                state.currentSendingPromise.reject(new Error(request.payload || "Fallo en el envío por UI reportado por content script."));
                state.currentSendingPromise = null;
            }
            break;
        
        case 'GET_WHATSAPP_STATUS':
             getOrCreateWhatsAppTab().then(tab => {
                sendResponse({
                    isWhatsAppReady: state.isWhatsAppReady,
                    tabId: state.whatsappTabId,
                    tabStatus: tab.status
                });
             });
             return true;
        
        // El content script nos avisa que está listo en una pestaña.
        case 'CONTENT_SCRIPT_READY':
             console.log(`APYSKY: Content script listo en la pestaña: ${sender.tab.id}`);
             if (sender.tab.url.includes(WHATSAPP_WEB_URL)) {
                state.whatsappTabId = sender.tab.id;
                state.isWhatsAppReady = true;
             }
            break;
    }
    
    return false; // No hay respuesta asíncrona para los casos que no la devuelven explícitamente.
});


// ------------------- GESTIÓN DEL ESTADO DE LA PESTAÑA -------------------

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && tab.url.includes(WHATSAPP_WEB_URL)) {
        console.log(`APYSKY: Pestaña de WhatsApp Web actualizada: ${tabId}`, changeInfo.status);
        if (changeInfo.status === 'complete') {
            state.isWhatsAppReady = true;
            state.whatsappTabId = tabId;
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId === state.whatsappTabId) {
        console.log('APYSKY: La pestaña de WhatsApp Web ha sido cerrada.');
        state.whatsappTabId = null;
        state.isWhatsAppReady = false;
    }
});

// Inicialización al arrancar
getOrCreateWhatsAppTab();
console.log('APYSKY: Background script inicializado.');
