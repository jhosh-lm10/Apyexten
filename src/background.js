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
    isSending: false,
    currentSendingPromise: null,
    delayBetweenMessages: 5000, // 5 segundos entre mensajes
    delayBetweenImages: 7000 // 7 segundos entre imágenes
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

async function processQueue() {
    if (state.isSending || state.messageQueue.length === 0) return;
    
    state.isSending = true;
    const { to, message, resolve, reject } = state.messageQueue[0];
    
    try {
        console.log(`Procesando mensaje para: ${to}`);
        const result = await sendSingleMessage(to, message);
        resolve(result);
        
        // Eliminar el mensaje procesado de la cola
        state.messageQueue.shift();
        
        // Esperar antes de procesar el siguiente mensaje
        await new Promise(resolve => setTimeout(resolve, state.delayBetweenMessages));
    } catch (error) {
        console.error(`Error al enviar mensaje a ${to}:`, error);
        reject(error);
        state.messageQueue.shift();
    } finally {
        state.isSending = false;
        // Procesar el siguiente mensaje en la cola
        processQueue();
    }
}

async function sendMessage(to, message) {
    return new Promise((resolve, reject) => {
        // Agregar a la cola
        state.messageQueue.push({
            to,
            message,
            resolve,
            reject
        });
        
        // Iniciar el procesamiento si no está en curso
        if (!state.isSending) {
            processQueue();
        }
    });
}

async function sendSingleMessage(to, message) {
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
        }, 60000); // Aumentado a 60 segundos de timeout

        // El listener se encargará de resolver esta promesa.
        chrome.tabs.update(tab.id, { url, active: true }, () =>
            console.log('APYSKY: Actualización de pestaña completada.')
        );

        // Limpiar el timeout y la promesa si la pestaña se cierra o hay un error
        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (state.currentSendingPromise) {
                state.currentSendingPromise = null;
            }
            chrome.tabs.onRemoved.removeListener(onTabRemoved);
        };

        const onTabRemoved = (tabId) => {
            if (tabId === tab.id) {
                cleanup();
                reject(new Error('La pestaña de WhatsApp se cerró durante el envío.'));
            }
        };

        chrome.tabs.onRemoved.addListener(onTabRemoved);

        // Limpiar después de 65 segundos (5 segundos después del timeout)
        setTimeout(cleanup, 65000);
    });
}

/* ──────────────────────────────────────────────────────────────
 *  NUEVO  –  envía imagen + caption usando la UI de WhatsApp Web
 * ──────────────────────────────────────────────────────────────*/
async function sendImage({ to, dataUrl, caption = '', delay }) {
    console.log('APYSKY: Preparando envío de imagen a:', to);
    const tab = await getOrCreateWhatsAppTab();
    
    // Aplicar delay si se especifica
    if (delay !== undefined) {
        console.log(`APYSKY: Aplicando delay de ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
    } else if (state.delayBetweenImages > 0) {
        console.log(`APYSKY: Aplicando delay entre imágenes: ${state.delayBetweenImages}ms`);
        await new Promise(r => setTimeout(r, state.delayBetweenImages));
    }

    // Navegar al chat del destinatario primero
    const url = `${WHATSAPP_WEB_URL}send?phone=${to}`;
    console.log(`APYSKY: Navegando al chat de ${to}`);
    await chrome.tabs.update(tab.id, { url, active: true });
    
    // Esperar a que cargue la página
    await new Promise(r => setTimeout(r, 1500));

    return new Promise((resolve, reject) => {
        // Configurar timeout para el envío
        const timeoutId = setTimeout(() => {
            if (state.currentSendingPromise) {
                console.error('APYSKY: Timeout esperando la confirmación del envío de imagen');
                const { reject: currentReject } = state.currentSendingPromise;
                state.currentSendingPromise = null;
                currentReject(new Error('Timeout esperando confirmación del envío de imagen'));
            }
        }, 60000); // 60 segundos de timeout

        // Guardar la promesa actual junto con el timeoutId
        state.currentSendingPromise = { resolve, reject, timeoutId };

        const cleanup = () => {
            if (state.currentSendingPromise) {
              try { clearTimeout(state.currentSendingPromise.timeoutId); } catch {}
              state.currentSendingPromise = null;
            }
          };
          

        // Inyectar el script para enviar la imagen
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
                // Función inyectada
                async function injectImage(dataUrl, caption) {
                    try {
                      console.log('APYSKY: Inyectando imagen…');
                  
                     /* ────────────────── 1️⃣  ABRIR menú “Adjuntar” ────────────────── */
const CLIP_SELECTOR = [
    'span[data-icon="clip"]',                  // diseño clásico
    'span[data-icon="attach-menu-plus"]',      // rediseño 2024
    'button[aria-label="Adjuntar"]',           // fallback i18n
    'div[role="button"][data-testid="attach-media-picker"]', // **nuevo**
    'button[title="Adjuntar"]'                 // **nuevo (algunas betas)**
  ].join(',');
  
  const clipBtn = await new Promise((ok, fail) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const el = document.querySelector(CLIP_SELECTOR);
      if (el) { clearInterval(id); ok(el); }
      else if (Date.now() - t0 > 15_000) {     // ⬆ subimos timeout a 15 s
        clearInterval(id);
        fail(new Error('Timeout esperando botón Adjuntar'));
      }
    }, 250);                                   // ligera pausa
  });
  clipBtn.click();
  
                  
                      /* ────────────────── 2️⃣  SUBIR la imagen ────────────────── */
                      const input = await new Promise((ok, fail) => {
                        const t0 = Date.now();
                        const id = setInterval(() => {
                          const el = document.querySelector('input[type="file"][accept*="image"]');
                          if (el) { clearInterval(id); ok(el); }
                          else if (Date.now() - t0 > 5_000) {
                            clearInterval(id);
                            fail(new Error('Timeout esperando <input type=file>'));
                          }
                        }, 200);
                      });
                  
                      const blob = await (await fetch(dataUrl)).blob();
                      const file = new File([blob], 'img.png', { type: blob.type });
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      input.files = dt.files;
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                  
                      /* ─────────────── 2½️⃣  Pie de foto opcional ─────────────── */
                      if (caption) {
                        await new Promise(r => setTimeout(r, 800));
                        const box = document.querySelector(
                          '[data-testid="media-caption-input"] div[contenteditable="true"],' +
                          'div[contenteditable="true"][data-lexical-editor="true"]'
                        );
                        if (box) {
                          box.textContent = caption;
                          box.dispatchEvent(new InputEvent('input', { bubbles: true }));
                        }
                      }
                  
/* ────────────────── 3️⃣  LOCALIZAR + ENVIAR ────────────────── */

const SEND_BTN_TIMEOUT = 15_000;   // 15 s máx.
const POLL             =    250;   // cada 250 ms

const sendBtn = await new Promise((ok, fail) => {
  const t0 = Date.now();
  const probe = () => {
    /* — 1. Diseño 2024: div[role="button"][aria-label="Enviar"] — */
    let el = document.querySelector('div[role="button"][aria-label="Enviar"]');
    if (el && el.offsetParent) return ok(el);

    /* — 2. Icono interno “wds-ic-send-filled” (por si cambia aria-label) — */
    const icon = document.querySelector('span[data-icon="wds-ic-send-filled"]');
    if (icon && icon.offsetParent) {
      el = icon.closest('[role="button"]') || icon.closest('button') || icon;
      if (el) return ok(el);
    }

    /* — 3. Fallbacks antiguos — */
    el = document.querySelector('footer [data-icon^="send"], button[aria-label="Enviar"]');
    if (el && el.offsetParent) return ok(el.closest('button') || el);

    /* — 4. seguir buscando… o abortar — */
    if (Date.now() - t0 > SEND_BTN_TIMEOUT)
      return fail(new Error('Timeout localizando botón Enviar'));

    setTimeout(probe, POLL);
  };
  probe();
});

/* clic normal; si falla, simulamos “Enter” */
try {
  sendBtn.click();
} catch {
  document.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', {bubbles:true, key:'Enter', code:'Enter'})
  );
}

                      /* ─────────────── 4️⃣  Pequeño retardo de gracia ─────────────── */
                      await new Promise(r => setTimeout(r, 1_200));
                  
                      console.log('APYSKY: Imagen enviada ✔︎');
                       if (typeof chrome === 'object' && chrome.runtime?.sendMessage) {
                           chrome.runtime.sendMessage({ action: 'UI_IMAGE_SUCCESS' });
                         } else {
                           window.postMessage({ APYSKY: 'IMAGE_SUCCESS' }, '*');
                         }

                    } catch (err) {
                      console.error('APYSKY: Error en injectImage:', err);
                      throw err;
                    }
                  }
                  
                
                // Iniciar el proceso
                injectImage(data.dataUrl, data.caption).catch(error => {
                    console.error('APYSKY: Error al inyectar imagen:', error);
                    chrome.runtime.sendMessage({ 
                        action: 'UI_IMAGE_ERROR',
                        error: error.message 
                    });
                });
            },
            args: [{ dataUrl, caption }],
            world: "MAIN"
        }).catch(error => {
            console.error('APYSKY: Error al ejecutar el script de inyección:', error);
            const errorMsg = `Error al inyectar el script: ${error.message}`;
            cleanup();
            reject(new Error(errorMsg));
        });
    });
}

// ------------------- MANEJO DE RESPUESTAS DE LA UI -------------------

// Escuchar mensajes del content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('APYSKY: Mensaje recibido en background:', request);

    switch (request.action) {
           /* ========= IMAGEN ENVIADA CORRECTAMENTE ========= */
           case 'UI_IMAGE_SUCCESS':
               console.log('APYSKY: Imagen enviada con éxito');
               if (state.currentSendingPromise) {
                   const { resolve, timeoutId } = state.currentSendingPromise;
                   clearTimeout(timeoutId);
                   state.currentSendingPromise = null;
                   resolve('Imagen enviada correctamente');
              }
               break;
        
        case 'UI_IMAGE_ERROR':
            console.error('APYSKY: Error al enviar imagen desde el content script:', request.error);
            if (state.currentSendingPromise) {
                const { reject, timeoutId } = state.currentSendingPromise;
                clearTimeout(timeoutId);
                state.currentSendingPromise = null;
                reject(new Error(request.error || 'Error desconocido al enviar imagen'));
            }
            break;
        case 'SEND_MESSAGE':
            // Manejar la respuesta asíncrona correctamente
            (async () => {
                try {
                    const result = await sendMessage(request.payload.to, request.payload.message);
                    sendResponse({ success: true, data: result });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicar respuesta asíncrona.

            case 'UI_SEND_SUCCESS':
                if (state.currentSendingPromise) {
                    console.log("APYSKY: Recibido UI_SEND_SUCCESS del content script.");
                    const { resolve } = state.currentSendingPromise;
                    state.currentSendingPromise = null;
                    resolve("Mensaje enviado con éxito por UI.");
                }
                break;
    

                case 'UI_SEND_FAILURE':
                    if (state.currentSendingPromise) {
                        console.error("APYSKY: Recibido UI_SEND_FAILURE del content script:", request.payload);
                        const { reject } = state.currentSendingPromise;
                        state.currentSendingPromise = null;
                        reject(new Error(request.payload || "Fallo en el envío por UI reportado por content script."));
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
        
             case 'SEND_IMAGE':
                (async () => {
                    try {
                        const result = await sendImage(request.payload);
                        sendResponse({ success: true, data: result });
                    } catch (error) {
                        console.error('APYSKY: Error en SEND_IMAGE:', error);
                        sendResponse({ 
                            success: false, 
                            error: error.message 
                        });
                    }
                })();
                return true; // Mantener el mensaje abierto para respuesta asíncrona

        // El content script nos avisa que está listo en una pestaña.
        case 'CONTENT_SCRIPT_READY':
             console.log(`APYSKY: Content script listo en la pestaña: ${sender.tab.id}`);
             if (sender.tab.url.includes(WHATSAPP_WEB_URL)) {
                state.whatsappTabId = sender.tab.id;
                state.isWhatsAppReady = true;
             }
            break;

            case 'GET_SCHEDULED_MESSAGES':
// aún sin implementar – simplemente responde vacío
sendResponse({ scheduled: [] });
return true;
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

// Verificar periódicamente el estado de WhatsApp Web
setInterval(() => {
    if (state.whatsappTabId) {
        chrome.tabs.get(state.whatsappTabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                console.log('APYSKY: La pestaña de WhatsApp Web se perdió, intentando recuperar...');
                state.whatsappTabId = null;
                state.isWhatsAppReady = false;
                getOrCreateWhatsAppTab();
            } else if (tab.status === 'complete') {
                state.isWhatsAppReady = true;
            }
        });
    }
}, 10000); // Verificar cada 10 segundos
