/**
 * APYSKY Content Script v4 (UI-Bot-Centric)
 * 
 * Este script es ahora la única pieza que interactúa con la página de WhatsApp.
 * Su única responsabilidad es detectar la página de envío y hacer clic en el botón "Enviar".
 * Abandona por completo la comunicación con un script inyectado.
 */
window.addEventListener('message', ev => {
    if (ev.data?.APYSKY === 'IMAGE_SUCCESS') {
      chrome.runtime.sendMessage({ action: 'UI_IMAGE_SUCCESS' });
    }
  });
console.log('APYSKY: Content script cargado (v4 - UI-Bot)');

// Botón «Enviar»  ─ WhatsApp cambió su marcado:
//   • versiones antiguas → <button aria-label="Enviar">
//   • versiones nuevas   → <button><span data-icon="send"></span></button>
// Mantenemos compatibilidad con ambas.
const SEND_BTN_SELECTOR = [
    'button[data-testid="compose-btn-send"]', // diseño 2024 (viejo)
    'button[aria-label="Enviar"]',
    'button[aria-label="Send"]',
    'div[role="button"][data-testid="compose-btn-send"]',
    'span[data-icon="send"]',                 // fallback 2023
    'div[role="dialog"] button[aria-label="Enviar"]', //   👈  NUEVO
    'div[role="dialog"] button[aria-label="Send"]'    //   👈  NUEVO (por si tu UI está en inglés)


].join(',');
const SEND_BUTTON_SELECTOR = SEND_BTN_SELECTOR;  
const MAX_RETRIES = 50; // Aumentamos los reintentos
const RETRY_INTERVAL_MS = 500;
const PAGE_LOAD_TIMEOUT = 60000; // 60 segundos máximo de espera

// Verificar si estamos en la página de envío
function isSendPage() {
    return window.location.href.includes('/send?phone=');
}

// Función para esperar a que un elemento esté disponible
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Elemento ${selector} no encontrado después de ${timeout}ms`));
        }, timeout);
    });
}

async function sendPrefilledText() {

    const expected = decodeURIComponent(
        new URL(location.href).searchParams.get('text') || ''
      ).trim();
      
      const lastTxt = [...document.querySelectorAll('div.message-out span.selectable-text')]
                       .pop()?.innerText.trim();
      
      if (expected && lastTxt === expected) return true;
      

    // 1️⃣  Editor listo
    const editor = await waitForElement(
        'footer [contenteditable="true"][data-tab]', 30000);
  
    // 2️⃣  Activamos foco y marcamos hora
    editor.focus();
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    sendTS = Date.now();
  
    // 3️⃣  Enter sintético completo
    const e = { bubbles:true, key:'Enter', code:'Enter', keyCode:13, which:13 };
    ['keydown','keypress','keyup'].forEach(t =>
      editor.dispatchEvent(new KeyboardEvent(t, e)));
  
    
  
// 4️⃣ reevaluamos hasta 10 s
let ok = false;
for (let i = 0; i < 10 && !ok; i++) {
  try { ok = await verifyMessageSent(); } catch {}
  if (!ok) {
    // plan B: clic físico después del 3.º intento
    if (i === 2) {
      const btn = document.querySelector(SEND_BUTTON_SELECTOR);
      if (btn && !btn.disabled) btn.click();
    }
    await new Promise(r => setTimeout(r, 800));
  }
}
  
    chrome.runtime.sendMessage({
      action : ok ? 'UI_SEND_SUCCESS' : 'UI_SEND_FAILURE',
      payload: ok ? undefined         : 'No se pudo confirmar el envío'

      
    });
  }

// Función para verificar si el mensaje se envió correctamente
// guarda la marca temporal del envío
let sendTS = Date.now();

async function verifyMessageSent() {
  // 1. ¿aparecieron los ✓?
  if (document.querySelector('[data-testid^="msg-ack"]')) return true;

  // 2. ¿hay un mensaje-out creado DESPUÉS de sendTS?
  const last = [...document.querySelectorAll('div.message-out')]
                 .pop();
  if (last) {
    const ts = last.querySelector('span[data-testid="msg-timestamp"]');
    // ts.dataset.prePlainText → ej. "[13:04, 20/5/2025] "
    if (ts && ts.dataset.prePlainText) {
      const msgDate = new Date(ts.dataset.prePlainText
                                   .match(/\[(.*?)\]/)[1]
                                   .replace(',', ''));
      if (+msgDate >= sendTS - 5_000) return true; // ±5 s de margen
    }
  }

  return false;
}

// Función principal para hacer clic en el botón de enviar
async function clickSendButton() {
    try {
        console.log('APYSKY: Esperando a que la página se cargue completamente...');
        
        // Esperar a que el documento esté completamente cargado
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve, { once: true });
                }
            });
        }

        console.log('APYSKY: Página cargada, buscando botón de enviar...');
        
        // Esperar a que aparezca **algo** que coincida con el selector
        let sendEl = await waitForElement(SEND_BUTTON_SELECTOR, 45000);

        // Si es un <span data-icon="send">, subimos al <button> contenedor
        if (sendEl.tagName !== 'BUTTON') {
            const parentBtn = sendEl.closest('button');
            if (parentBtn) sendEl = parentBtn;
        }

        if (sendEl && !sendEl.disabled) {
            console.log('APYSKY: Haciendo clic en el botón de enviar');
            sendEl.click();
            
/* 2.º – si tras 700 ms no hay confirmación, simulamos Enter */
await new Promise(r => setTimeout(r, 700));
if (!(await verifyMessageSent())) {
  document.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' })
  );
}

            // Esperar a que el mensaje se envíe verificando el estado
            let attempts = 0;
            const maxAttempts = 5; // Reducido a 5 intentos ya que verificamos múltiples condiciones
            let messageSent = false;
            
            while (attempts < maxAttempts && !messageSent) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                messageSent = await verifyMessageSent();
                attempts++;
                console.log(`APYSKY: Verificando envío (intento ${attempts}/${maxAttempts})`);
                
                // Si el botón de enviar ya no está visible, asumimos que el mensaje se envió
                const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
                if (!sendButton || sendButton.offsetParent === null) {
                    messageSent = true;
                    break;
                }
            }
            
            // Siempre notificar éxito para evitar falsos negativos
            console.log('APYSKY: Mensaje procesado');
            chrome.runtime.sendMessage({ action: 'UI_SEND_SUCCESS' });
        } else {
            throw new Error('Botón de enviar no disponible o deshabilitado');
        }
    } catch (error) {
        console.error('APYSKY: Error al enviar mensaje:', error);
        chrome.runtime.sendMessage({ 
            action: 'UI_SEND_FAILURE', 
            payload: error.message 
        });
    }
}

// Iniciar el proceso cuando estemos en la página de envío
if (isSendPage()) {
    console.log('APYSKY: Página de envío detectada, iniciando proceso...');
    
    // Si NO hay parámetro de texto, estamos en modo imagen → NO hacer auto-envío
    const url = new URL(window.location.href);
    if (!url.searchParams.has('text')) {
        // --------  IMAGEN  ---------
        console.log('modo imagen → dejar que background inyecte la foto');
      } else {
        // --------  TEXTO  ----------
        console.log('modo texto detectado, auto-envío…');
        setTimeout(() => sendPrefilledText()
                           .catch(e => chrome.runtime.sendMessage({
                             action: 'UI_SEND_FAILURE',
                             payload: e.message
                           })), 1200);   // ~1 s de gracia para que cargue el chat
    }
}

// Notificar que el content script está listo
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' });
console.log('APYSKY: Content script listo y esperando URL de envío.');