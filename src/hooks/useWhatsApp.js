import { useState, useEffect, useCallback, useRef } from 'react';
import { formatErrorForUser, logError, ERROR_CODES } from '../utils/errorHandler';

const useWhatsApp = (notifications) => {
  const [isWhatsAppReady, setIsWhatsAppReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({ success: null, message: '' });
  const [retryCount, setRetryCount] = useState(0);
  
  // Referencias estables para evitar dependencias en useCallback
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const isExtensionEnvironment = () =>
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;

  const checkWhatsAppStatus = useCallback(async (isRetry = false) => {
    if (!isExtensionEnvironment()) {
      console.log('APYSKY: No es un entorno de extensión. Simulando conexión.');
      setIsLoading(false);
      setIsWhatsAppReady(true);
      return true;
    }

    try {
      setIsLoading(true);
      
      const response = await Promise.race([
        chrome.runtime.sendMessage({ action: 'GET_WHATSAPP_STATUS' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 10000)
        )
      ]);
      
      if (response && response.tabId) {
        // Solo logear si hay cambio de estado real (usando callback para obtener estado actual)
        setIsWhatsAppReady(currentReady => {
          if (response.isWhatsAppReady !== currentReady && currentReady !== null) {
            console.log('APYSKY: Estado WhatsApp:', response.isWhatsAppReady ? '✅ Conectado' : '❌ Desconectado');
          }
          return response.isWhatsAppReady;
        });
        
        setRetryCount(0);
        
        // ✅ Silencioso - sin notificación de conexión molesta
        return response.isWhatsAppReady;
      } else {
        throw new Error('Respuesta inválida del background al verificar estado');
      }
    } catch (error) {
      logError(error, 'checkWhatsAppStatus');
      setIsWhatsAppReady(false);
      
      if (!isRetry) {
        const errorInfo = formatErrorForUser(error);
        // ✅ Silencioso - sin notificación de error molesta
        
        // Solo reintentar si es recuperable (sin dependencias de estado)
        if (errorInfo.recoverable) {
          setRetryCount(currentRetries => {
            if (currentRetries < 3) {
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
                checkWhatsAppStatus(true);
              }, 3000 * (currentRetries + 1));
            }
            return currentRetries;
          });
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []); // Sin dependencias para evitar recreaciones

  const sendMessage = async (phoneNumbers, message) => {
    if (!isExtensionEnvironment()) {
      // ✅ Silencioso - sin notificación de simulación molesta
      return { success: true, successCount: 1, errorCount: 0 };
    }

    const parseNumbers = (text) => text.split(/[\n,\s]+/).filter(Boolean);
    const numbers = parseNumbers(phoneNumbers);
    
    // Validaciones mejoradas
    if (numbers.length === 0) {
      const error = new Error('NO_RECIPIENTS');
      const errorInfo = formatErrorForUser(error);
      // ✅ Silencioso - sin notificación de error molesta final
      setSendStatus({ success: false, message: errorInfo.message });
      return { success: false, errorCount: 1 };
    }

    if (!message || message.trim() === '') {  
      const error = new Error('EMPTY_MESSAGE');
      const errorInfo = formatErrorForUser(error);
      // ✅ Silencioso - sin notificación de mensaje vacío molesta
      setSendStatus({ success: false, message: errorInfo.message });
      
      // ✅ CRITICAL: Reset isSending on empty message
      setIsSending(false);
      
      return { success: false, errorCount: 1 };
    }

    setIsSending(true);
    setSendStatus({ success: null, message: `Enviando ${numbers.length} mensajes...` });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Función para limpiar HTML
    const cleanHtml = (html) => {
      if (!html) return '';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    };
    
    for (const [index, number] of numbers.entries()) {
      const cleanNumber = number.replace(/\D/g, '');
      const cleanedMessage = cleanHtml(message);
      
      setSendStatus({ 
        success: null, 
        message: `Enviando a ${cleanNumber} (${index + 1}/${numbers.length})` 
      });
      
      try {
        console.log(`APYSKY: Iniciando envío a ${cleanNumber}`);
        const response = await Promise.race([
          chrome.runtime.sendMessage({
            action: 'SEND_MESSAGE',
            payload: { to: cleanNumber, message: cleanedMessage }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 30000)
          )
        ]);

        if (response && response.success) {
          console.log(`APYSKY: Mensaje a ${cleanNumber} enviado con éxito.`);
          successCount++;
        } else {
          const errorMsg = response?.error || 'Error desconocido';
          console.error(`APYSKY: Error al enviar mensaje a ${cleanNumber}:`, errorMsg);
          errors.push({ number: cleanNumber, error: errorMsg });
          errorCount++;
        }
      } catch (error) {
        logError(error, `sendMessage to ${cleanNumber}`);
        errors.push({ number: cleanNumber, error: error.message });
        errorCount++;
      }
      
      // Pausa entre mensajes (variable según el éxito)
      if (index < numbers.length - 1) {
        const delay = errorCount > successCount ? 2000 : 1000; // Más tiempo si hay errores
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // ✅ ALWAYS reset isSending, even on errors
    setIsSending(false);
    
    const finalMessage = `Envío completado. Éxitos: ${successCount}. Fallos: ${errorCount}.`;
    setSendStatus({
      success: errorCount === 0,
      message: finalMessage
    });
    
    // ✅ Auto-clear status after 3 seconds to unlock UI
    setTimeout(() => {
      setSendStatus({ success: null, message: '' });
    }, 3000);

    // ✅ Silencioso - sin notificaciones de resultado molestas

    return { success: errorCount === 0, successCount, errorCount, errors };
  };

  const sendImage = async (phoneNumbers, imageFile, caption = '') => {
    if (!isExtensionEnvironment()) {
      alert(`Simulando envío de imagen a:\n${phoneNumbers}\n\nPie de foto:\n${caption}`);
      return;
    }

    const parseNumbers = (text) => text.split(/[\n,\s]+/).filter(Boolean);
    const numbers = parseNumbers(phoneNumbers);
    
    if (numbers.length === 0) {
      setSendStatus({ success: false, message: 'Agrega números antes de enviar' });
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [idx, number] of numbers.entries()) {
      try {
        setSendStatus({
          success: null,
          message: `Enviando imagen a ${number} (${idx + 1}/${numbers.length})`
        });

        await handleSendImage(number, imageFile, caption);
        successCount++;
      } catch (error) {
        console.error(`APYSKY: Error al enviar imagen a ${number}:`, error);
        errorCount++;
      }
      
      // Pausa entre envíos
      if (idx < numbers.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setIsSending(false);
    setSendStatus({
      success: errorCount === 0,
      message: `Imágenes enviadas. Éxitos: ${successCount} | Fallos: ${errorCount}`
    });
    
    // ✅ Auto-clear status after 3 seconds to unlock UI
    setTimeout(() => {
      setSendStatus({ success: null, message: '' });
    }, 3000);
  };

  const handleSendImage = async (phoneNumber, imageFile, caption = '') => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target.result;
          const response = await chrome.runtime.sendMessage({
            action: 'SEND_IMAGE',
            payload: {
              to: phoneNumber,
              dataUrl,
              caption,
              delay: 2000
            }
          });
          resolve(response);
        } catch (error) {
          console.error('APYSKY: Error al enviar imagen:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('APYSKY: Error al leer la imagen:', error);
        reject(new Error('Error al leer el archivo de imagen'));
      };
      reader.readAsDataURL(imageFile);
    });
  };

  // Configurar listeners al montar (solo una vez)
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.action === 'WHATSAPP_CONNECTED') {
        setIsWhatsAppReady(true);
        setIsLoading(false);
      } else if (message.action === 'WHATSAPP_DISCONNECTED') {
        setIsWhatsAppReady(false);
        setIsLoading(false);
      }
    };

    if (isExtensionEnvironment()) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    return () => {
      if (isExtensionEnvironment()) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, []); // Sin dependencias para evitar re-ejecuciones

  // Verificar estado inicial solo una vez
  useEffect(() => {
    checkWhatsAppStatus();
  }, []); // Solo al montar

  return {
    isWhatsAppReady,
    isLoading,
    isSending,
    sendStatus,
    setSendStatus,
    checkWhatsAppStatus,
    sendMessage,
    sendImage,
    retryCount
  };
};

export default useWhatsApp;