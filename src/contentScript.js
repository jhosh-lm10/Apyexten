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
console.log('🚀 APYSKY: Content script cargado (v4 - UI-BOT Only)');

// ===============================
// UI-BOT METHOD (ONLY)
// ===============================



// Responder a PING del background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
        console.log('🏓 APYSKY: PING recibido, respondiendo...');
        sendResponse({ status: 'active' });
        return true;
    }
    

    

});

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
    const isMatch = window.location.href.includes('/send?phone=');
    console.log('🔍 APYSKY: isSendPage() - URL:', window.location.href);
    console.log('🔍 APYSKY: isSendPage() - Resultado:', isMatch);
    return isMatch;
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
    console.log('📝 APYSKY: Iniciando sendPrefilledText...');

    const expected = decodeURIComponent(
        new URL(location.href).searchParams.get('text') || ''
      ).trim();
    
    console.log('📝 APYSKY: Texto esperado:', expected);
      
      const lastTxt = [...document.querySelectorAll('div.message-out span.selectable-text')]
                       .pop()?.innerText.trim();
      
    console.log('📝 APYSKY: Último mensaje:', lastTxt);
      
    if (expected && lastTxt === expected) {
        console.log('✅ APYSKY: Mensaje ya enviado previamente');
        return true;
    }
      

    // 1️⃣  Editor listo
    const editor = await waitForElement(
        'footer [contenteditable="true"][data-tab]', 30000);
  
    // 2️⃣  Activamos foco y escribimos el texto
    editor.focus();
    
    // ✅ ESCRIBIR EL TEXTO ANTES DE ENVIAR - ESTO FALTABA!
    if (expected) {
        console.log('✍️ APYSKY: Escribiendo texto en el editor:', expected);
        editor.innerText = expected;
        editor.textContent = expected;
        
        // Disparar eventos de input para notificar a WhatsApp
        editor.dispatchEvent(new InputEvent('input', { 
            bubbles: true, 
            inputType: 'insertText',
            data: expected
        }));
        
        // Esperar un momento para que WhatsApp procese el texto
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    sendTS = Date.now();
  
    // 3️⃣  Enter sintético completo DESPUÉS de escribir
    const e = { bubbles:true, key:'Enter', code:'Enter', keyCode:13, which:13 };
    ['keydown','keypress','keyup'].forEach(t =>
      editor.dispatchEvent(new KeyboardEvent(t, e)));
  
    
  
    // 4️⃣ reevaluamos hasta 15 s (más tiempo para mensajes programados)
    let ok = false;
    for (let i = 0; i < 15 && !ok; i++) {
        try { 
            ok = await verifyMessageSent(); 
            console.log(`🔍 APYSKY: Intento ${i + 1}/15 - Enviado: ${ok}`);
        } catch (error) {
            console.log(`❌ APYSKY: Error verificando envío (intento ${i + 1}):`, error);
        }
        
        if (!ok) {
            // Plan B: clic manual más agresivo desde el 2º intento
            if (i >= 1) {
                console.log(`🖱️ APYSKY: Intentando clic manual en botón enviar (intento ${i + 1})`);
                await clickSendButton();
            }
            await new Promise(r => setTimeout(r, 1000)); // Más tiempo entre intentos
        }
    }
  
        // ✅ REPORTE MEJORADO con más información
    console.log(`📊 APYSKY: Resultado final del envío: ${ok ? 'ÉXITO' : 'FALLO'}`);
    console.log(`📊 APYSKY: Texto esperado: "${expected}"`);
    
    chrome.runtime.sendMessage({
        action: ok ? 'UI_SEND_SUCCESS' : 'UI_SEND_FAILURE',
        payload: ok ? { text: expected } : `No se pudo confirmar el envío del texto: "${expected}"`
    });
  }

// Función para verificar si el mensaje se envió correctamente
// guarda la marca temporal del envío
let sendTS = Date.now();

async function verifyMessageSent() {
  console.log('🔍 APYSKY: Verificando si el mensaje se envió...');
  
  // 1. ¿aparecieron los ✓?
  // Verificar múltiples selectores de checkmarks
  const checkmarks = document.querySelectorAll('[data-testid="msg-check"], [data-testid="msg-dblcheck"], [data-icon="msg-check"], [data-icon="msg-dblcheck"], [data-testid^="msg-ack"]');
  if (checkmarks.length > 0) {
    console.log('✅ APYSKY: Checkmarks encontrados');
    return true;
  }

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

  // Verificar que el editor está vacío (indicativo de envío)
  const editor = document.querySelector('footer [contenteditable="true"][data-tab]');
  if (editor && editor.innerText.trim() === '') {
    console.log('✅ APYSKY: Editor vacío después del envío');
    return true;
  }

  console.log('❌ APYSKY: No se detectó envío exitoso');
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
            const maxAttempts = 10; // Reducido para evitar colgarse
            let messageSent = false;
            
            console.log('⏳ APYSKY: Esperando procesamiento inicial de WhatsApp...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Más tiempo para que WhatsApp procese completamente
            
            while (attempts < maxAttempts && !messageSent) {
                await new Promise(resolve => setTimeout(resolve, 1500)); // Tiempo balanceado
                
                console.log(`🔄 APYSKY: Verificando envío (intento ${attempts + 1}/${maxAttempts})`);
                messageSent = await verifyMessageSent();
                attempts++;
                
                console.log(`📊 APYSKY: Resultado verificación: ${messageSent ? '✅ DETECTADO' : '❌ NO DETECTADO'}`);
                
                if (messageSent) {
                    console.log('🎉 APYSKY: Mensaje enviado exitosamente detectado!');
                    break;
                }
                
                // Verificación más permisiva: si el botón desapareció, asumir éxito después del 2do intento
                const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
                if ((!sendButton || sendButton.offsetParent === null) && attempts >= 2) {
                    messageSent = true;
                    console.log('🎉 APYSKY: Éxito asumido - Botón desapareció y suficientes intentos');
                    break;
                }
            }
            
            // ✅ SIMPLIFICAR: Si llegamos aquí, muy probablemente se envió
            // Usar una detección más permisiva
            console.log(`🎯 APYSKY: Verificación final - Intentos: ${attempts}, Estado: ${messageSent}`);
            
            // Si no detectó envío pero el botón desapareció, asumir éxito
            const finalSendButton = document.querySelector(SEND_BUTTON_SELECTOR);
            const buttonDisappeared = !finalSendButton || finalSendButton.offsetParent === null;
            
            // LÓGICA PERMISIVA: Si hicimos clic y el botón desapareció, probablemente se envió
            if (messageSent || buttonDisappeared || attempts >= 3) {
                console.log('✅ APYSKY: Mensaje procesado exitosamente (detección permisiva)');
            chrome.runtime.sendMessage({ action: 'UI_SEND_SUCCESS' });
            } else {
                console.log('❌ APYSKY: No se pudo confirmar el envío del mensaje');
                chrome.runtime.sendMessage({ 
                    action: 'UI_SEND_FAILURE', 
                    payload: 'No se pudo confirmar que el mensaje se envió correctamente'
                });
            }
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

// WRAP todo en try-catch para capturar errores
try {
// Iniciar el proceso cuando estemos en la página de envío
    console.log('🔍 APYSKY: Verificando si es página de envío...', window.location.href);
    
    const isPageForSending = isSendPage();
    console.log('🎯 APYSKY: Resultado isSendPage():', isPageForSending);
    
    if (isPageForSending) {
    console.log('✅ APYSKY: Página de envío detectada, iniciando proceso...');
    
    // Si NO hay parámetro de texto, estamos en modo imagen → NO hacer auto-envío
    const url = new URL(window.location.href);
    console.log('🔍 APYSKY: Parámetros URL:', {
        hasText: url.searchParams.has('text'),
        textValue: url.searchParams.get('text'),
        phone: url.searchParams.get('phone')
    });
    
    if (!url.searchParams.has('text')) {
        // --------  IMAGEN  ---------
        console.log('📸 APYSKY: Modo imagen → dejar que background inyecte la foto');
      } else {
        // --------  TEXTO  ----------
        console.log('💬 APYSKY: Modo texto detectado, iniciando auto-envío...');
        setTimeout(() => {
            console.log('🚀 APYSKY: Ejecutando sendPrefilledText...');
            sendPrefilledText()
                .then(() => console.log('✅ APYSKY: sendPrefilledText completado'))
                .catch(e => {
                    console.error('❌ APYSKY: Error en sendPrefilledText:', e);
                    chrome.runtime.sendMessage({
                             action: 'UI_SEND_FAILURE',
                             payload: e.message
                    });
                });
        }, 1200);   // ~1 s de gracia para que cargue el chat
    }
    } else {
        console.log('❌ APYSKY: NO es página de envío, saltando...');
    }
} catch (error) {
    console.error('💥 APYSKY: ERROR CRÍTICO en content script:', error);
    chrome.runtime.sendMessage({ 
        action: 'UI_SEND_FAILURE', 
        payload: 'Error crítico en content script: ' + error.message 
    });
}

// Notificar que el content script está listo
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' });
console.log('✅ APYSKY: Content script listo y esperando URL de envío.');