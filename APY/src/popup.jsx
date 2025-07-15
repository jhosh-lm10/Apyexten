import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './popup.css';
import { parsePhoneNumber } from 'libphonenumber-js';
import TemplateModal from './components/TemplateModal';

/* ------------------------------------------------------------------
  HELPERS STORAGE
-------------------------------------------------------------------*/
const getStorageData = (keys) =>
  new Promise((resolve, reject) => {
    if (!chrome.storage || !chrome.storage.local) {
      return reject(new Error('chrome.storage.local no está disponible'));
    }
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result);
    });
  });

const setStorageData = (data) =>
  new Promise((resolve, reject) => {
    if (!chrome.storage || !chrome.storage.local) {
      return reject(new Error('chrome.storage.local no está disponible'));
    }
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });

/* ------------------------------------------------------------------
  UTILIDADES
-------------------------------------------------------------------*/
const formatDateTime = (date) => {
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeRemaining = (scheduledTime) => {
  const now = new Date();
  const diff = scheduledTime - now;

  if (diff <= 0) return '¡Ahora!';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return `En ${parts.join(' ')}`;
};

/* ------------------------------------------------------------------
  VALIDACIÓN DE NÚMEROS DE TELÉFONO
-------------------------------------------------------------------*/
const validatePhone = (phone) => {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (!phoneNumber.isValid()) {
      return { valid: false, error: 'Número de teléfono inválido' };
    }
    return { valid: true, phone: phoneNumber.formatInternational() };
  } catch (error) {
    console.error('Error parsing phone number:', error);
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length < 6 || cleaned.length > 20) {
      return {
        valid: false,
        error: 'Número de teléfono inválido (debe tener entre 6 y 20 dígitos)'
      };
    }
    return { valid: true, phone: cleaned };
  }
};

const parseNumbers = (text) => {
  return text.split(/[\n,\s]+/).map((num) => {
    const result = validatePhone(num);
    return result.valid ? result.phone : num;
  });
};

const hasValidNumbers = (text) => {
  const numbers = parseNumbers(text);
  if (numbers.length === 0) return false;
  
  const results = numbers.map(validatePhone);
  return results.every(result => result.valid);
};

/* ------------------------------------------------------------------

/* ------------------------------------------------------------------
  ESTILOS QUILL (inline para no depender de archivo externo)
-------------------------------------------------------------------*/
const customStyles = `
  .ql-toolbar.ql-snow {
    border: 1px solid #b30000 !important;
    border-radius: 4px 4px 0 0 !important;
  }
  .ql-container.ql-snow {
    border: 1px solid #b30000 !important;
    border-top: none !important;
    border-radius: 0 0 4px 4px !important;
    min-height: 150px;
  }
  .ql-editor {
    min-height: 150px;
  }
  .ql-toolbar button:hover,
  .ql-toolbar button.ql-active {
    color: #b30000 !important;
  }
  .ql-toolbar button.ql-active .ql-stroke {
    stroke: #b30000 !important;
  }
  .ql-toolbar button.ql-active .ql-fill {
    fill: #b30000 !important;
  }
`;

const showNotification = (title, message, icon) => {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: icon || 'icon128.png',
      title: title,
      message: message,
      requireInteraction: true,
    });
  }
};

/* ------------------------------------------------------------------
  COMPONENTE PRINCIPAL
------------------------------------------------------------------*/
const Popup = () => {
  /* --------------------
     ESTADOS CONEXIÓN WA
  ---------------------*/
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isLoading: true,
    error: null,
    whatsAppTab: null,
  });

  /* --------------------
     ESTADOS ENVÍO
  ---------------------*/
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({ success: null, message: '' });
  
  // Cargar estado guardado al montar
  useEffect(() => {
    const loadFormState = async () => {
      try {
        const result = await getStorageData('formState');
        if (result.formState) {
          setNumbers(result.formState.numbers || '');
          setMessage(result.formState.message || '');
        }
      } catch (error) {
        console.error('Error al cargar el estado del formulario:', error);
      }
    };
    
    loadFormState();
  }, []); // Sólo se ejecuta una vez al montar el componente
  
  // Guardar estado cuando cambia (con debounce)
  useEffect(() => {
    const saveFormState = async () => {
      try {
        await setStorageData({ formState: { numbers, message } });
      } catch (error) {
        console.error('Error al guardar el estado del formulario:', error);
      }
    };

    const timer = setTimeout(saveFormState, 500); // debounce
    return () => clearTimeout(timer); // Limpiar el timer si cambia `numbers` o `message`
  }, [numbers, message]); // Sólo se ejecuta cuando los valores cambian

  /* --------------------
     PLANTILLAS
  ---------------------*/
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  /* --------------------
     IMPORT / EXPORT
  ---------------------*/
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importData, setImportData] = useState('');

  /* --------------------
     PROGRAMADOS
  ---------------------*/
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 5);
    return date;
  });
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(5); // segundos por defecto
  const [showScheduled, setShowScheduled] = useState(false);

  const handleToggleScheduled = () => {
    setShowScheduled((prev) => !prev);
    setShowTemplates(false); // Cierra la otra vista
  };

  const handleToggleTemplates = () => {
    setShowTemplates((prev) => !prev);
    setShowScheduled(false); // Cierra la otra vista
  };

  /* --------------------
     CONFIG EDITOR
  ---------------------*/
  const modules = useMemo(() => ({
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean']
  ]
}), []);

  const formats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'link',
  'image',
];

  /* ------------------------------------------------------------------
    HELPERS EXTENSIÓN
  ------------------------------------------------------------------*/
  const isExtensionEnvironment = () =>
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;

  /* ------------------------------------------------------------------
    CONEXIÓN WHATSAPP WEB
  ------------------------------------------------------------------*/
  /**
   * Verifica la conexión con WhatsApp Web
   * @returns {Promise<{isConnected: boolean, error?: string}>}
   */
  const checkWhatsAppConnection = useCallback(async () => {
    if (!isExtensionEnvironment()) {
      const errorMsg = 'No se puede conectar con WhatsApp Web en este entorno';
      setConnectionStatus({
        isConnected: false,
        isLoading: false,
        error: errorMsg,
        lastChecked: new Date().toISOString(),
        whatsAppTab: null
      });
      return { isConnected: false, error: errorMsg };
    }

    setConnectionStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'CHECK_WHATSAPP_CONNECTION' },
          (resp) => resolve(resp || { isConnected: false, error: 'No response from background' })
        );
      });

      if (!response || !response.isConnected) {
        throw new Error(response?.error || 'No se pudo conectar con WhatsApp Web');
      }

      setConnectionStatus({
        isConnected: response.isConnected,
        isLoading: false,
        error: null,
        lastChecked: new Date().toISOString(),
        whatsAppTab: response.tabId ? { id: response.tabId } : null
      });

      return response;
    } catch (error) {
      console.error('Error al verificar la conexión con WhatsApp Web:', error);
      const errorMessage = error.message || 'Error al conectar con WhatsApp Web';
      
      // Mostrar notificación al usuario
      showNotification('Error de Conexión', errorMessage);

      setConnectionStatus({
        isConnected: false,
        isLoading: false,
        error: errorMessage,
        whatsAppTab: null
      });
      return { isConnected: false, error: errorMessage };
    }
  }, []);


  const sendWhatsAppMessage = async (phoneNumber, messageText, isLast = true) => {
  try {
    setIsSending(true);
    setSendStatus({ success: null, message: `Enviando a ${phoneNumber}...` });
    
    // Verificar si estamos en el entorno de la extensión
    if (!isExtensionEnvironment()) {
      throw new Error('No se puede enviar mensajes fuera de la extensión');
    }
    
    // Validar número de teléfono usando libphonenumber
    const validation = validatePhone(phoneNumber);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const phone = validation.phone;
    
    // Verificar conexión con WhatsApp Web
    const connection = await checkWhatsAppConnection();
    if (!connection.isConnected) {
      throw new Error(connection.error || 'No se pudo conectar con WhatsApp Web');
    }
    
    // Enviar mensaje a través del service worker
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: 'SEND_MESSAGE',
          phone: phone,
          message: messageText
        },
        (response) => {
          // Manejar errores de la API de Chrome
          if (chrome.runtime.lastError) {
            const errorMessage = `Error de comunicación: ${chrome.runtime.lastError.message}`;
            console.error('APYSKY: Error de runtime:', errorMessage);
            
            // Mostrar notificación más visible
            showNotification('Error de Envío', `Error al enviar mensaje a ${phoneNumber}: ${errorMessage}`);
            
            setSendStatus({ success: false, message: errorMessage });
            resolve({ success: false, error: errorMessage });
            return;
          }
          
          // Verificar si hay una respuesta válida
          if (!response || !response.success) {
            const errorMessage = response?.error || 'No se recibió respuesta del servicio de mensajería';
            console.error('APYSKY:', errorMessage);
            
            // Mostrar notificación más visible
            showNotification('Error de Envío', `Error al enviar mensaje a ${phoneNumber}: ${errorMessage}`);
            
            setSendStatus({ success: false, message: errorMessage });
            resolve({ success: false, error: errorMessage });
            return;
          }
          
          // Manejar la respuesta del servicio
          if (response.success) {
            const statusMessage = `✓ Mensaje enviado a ${phoneNumber}`;
            console.log('APYSKY:', statusMessage);
            
            // Mostrar notificación de éxito
            showNotification('Mensaje Enviado', statusMessage);
            
            setSendStatus({ success: true, message: statusMessage });
            
            // Si no es el último mensaje, mostramos un estado de espera
            if (!isLast) {
              setSendStatus({ 
                success: null, 
                message: `Esperando ${delayBetweenMessages} segundos antes del siguiente envío...` 
              });
              
              // Esperamos el tiempo configurado antes de permitir el siguiente envío
              setTimeout(() => {
                resolve({ success: true, data: response });
              }, delayBetweenMessages * 1000);
              return;
            }
            
            resolve({ success: true, data: response });
          } else {
            // Manejar error del servicio
            const errorMessage = response.error || 'Error desconocido al enviar el mensaje';
            console.error('APYSKY: Error al enviar mensaje:', errorMessage);
            
            // Mostrar notificación más visible
            showNotification('Error de Envío', `Error al enviar mensaje a ${phoneNumber}: ${errorMessage}`);
            
            setSendStatus({ 
              success: false, 
              message: `Error al enviar a ${phoneNumber}: ${errorMessage}` 
            });
            resolve({ success: false, error: errorMessage });
          }
        }
      );
    });
    
  } catch (error) {
    console.error('APYSKY: Error en sendWhatsAppMessage:', error);
    const errorMessage = `Error al enviar a ${phoneNumber}: ${error.message || 'Error desconocido'}`;
    
    // Mostrar notificación más visible
    showNotification('Error de Envío', errorMessage);
    
    setSendStatus({ success: false, message: errorMessage });
    return { success: false, error: errorMessage };
  } finally {
    if (isLast) {
      setIsSending(false);
    }
  }
  };

  // Función para enviar mensajes a múltiples números con intervalo
  const sendBulkMessages = async (phoneNumbers, messageHtml) => {
    const messageText = messageHtml.replace(/<[^>]+>/g, ' ').trim();
    if (!messageText) return { success: false, error: 'El mensaje no puede estar vacío' };

    try {
      let sent = 0;
      let failed = 0;
      setIsSending(true);

      for (let i = 0; i < phoneNumbers.length; i++) {
        const phone = phoneNumbers[i].trim();
        const validation = validatePhone(phone);
        if (!validation.valid) {
          failed++;
          continue;
        }

        const phoneNumber = validation.phone;
        setSendStatus({ success: true, message: `Enviando a ${i + 1}/${phoneNumbers.length}: ${phoneNumber}` });

        const result = await sendWhatsAppMessage(phoneNumber, messageText, false);
        result.success ? sent++ : failed++;

        await new Promise((resolve) => setTimeout(resolve, 3500)); // Espera entre mensajes
      }

      setSendStatus({
        success: failed === 0,
        message: `Envío completado. Enviados: ${sent}, Fallidos: ${failed}`,
      });

      return { success: failed === 0, sent, failed };
    } catch (error) {
      console.error('Error al enviar mensajes masivos:', error);
      setSendStatus({ success: false, message: error.message });
      return { success: false, error: error.message };
    } finally {
      setIsSending(false);
    }
  };
  
  /* ------------------------------------------------------------------
     CARGAR PLANTILLAS Y PROGRAMADOS
  ------------------------------------------------------------------*/
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await getStorageData(['templates', 'scheduledMessages']);
        if (result.templates) setTemplates(result.templates);
        if (result.scheduledMessages) setScheduledMessages(result.scheduledMessages);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };

    loadData();

    if (isExtensionEnvironment()) {
      const interval = setInterval(checkScheduledMessages, 60000);
      return () => clearInterval(interval);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------------
     PROGRAMADOS: ENVÍO Y CHEQUEO
  ------------------------------------------------------------------*/
  const sendScheduledMessage = async ({ numbers: nums, content }) => {
    try {
      const [tab] = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      if (!tab) throw new Error('No se encontró una pestaña de WhatsApp Web abierta');

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (n, m) => window.postMessage({ type: 'APYSKY_SEND', numeros: n, mensaje: m }, '*'),
        args: [nums, content],
      });
    } catch (error) {
      console.error('Error al enviar mensaje programado:', error);
    }
  };

  const checkScheduledMessages = async () => {
    if (!isExtensionEnvironment()) return;

    const now = new Date();
    const { scheduledMessages: messages = [] } = await getStorageData('scheduledMessages');

    const messagesToSend = messages.filter((msg) => new Date(msg.scheduledTime) <= now);
    const remainingMessages = messages.filter((msg) => new Date(msg.scheduledTime) > now);

    if (messagesToSend.length) {
      await Promise.all(messagesToSend.map(sendScheduledMessage));
      await setStorageData({ scheduledMessages: remainingMessages });
      setScheduledMessages(remainingMessages);

      showNotification(
        'Mensajes Enviados',
        `Se han enviado ${messagesToSend.length} mensajes programados`
      );
    }
  };

  /* ------------------------------------------------------------------
     ENVÍO INMEDIATO / PROGRAMAR VIA UI
  ------------------------------------------------------------------*/

  const scheduleMessage = async ({ numbers: nums, content, scheduledTime }) => {
    const plain = content.replace(/<[^>]+>/g, '');
    const newMessage = {
      id: Date.now().toString(),
      name: plain.length > 30 ? `${plain.slice(0, 27)}...` : plain,
      numbers: nums,
      content,
      scheduledTime: scheduledTime.toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...scheduledMessages, newMessage];
    await setStorageData({ scheduledMessages: updated });
    setScheduledMessages(updated);
  };

  const cancelScheduledMessage = async (id) => {
    if (!window.confirm('¿Estás seguro de cancelar este mensaje programado?')) return;
    const updated = scheduledMessages.filter((m) => m.id !== id);
    await setStorageData({ scheduledMessages: updated });
    setScheduledMessages(updated);
  };

  /* ------------------------------------------------------------------
     CRUD PLANTILLAS
  ------------------------------------------------------------------*/
  const saveTemplate = async (template) => {
    const updatedTemplates = template.id
      ? templates.map((t) => (t.id === template.id ? template : t))
      : [...templates, { ...template, id: Date.now().toString(), createdAt: new Date().toISOString() }];

    await setStorageData({ templates: updatedTemplates });
    setTemplates(updatedTemplates);
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) return;
    const updated = templates.filter((t) => t.id !== id);
    await setStorageData({ templates: updated });
    setTemplates(updated);
  };

  const applyTemplate = (template) => {
    setMessage(template.content);
    setShowTemplates(false);
  };

  /* ------------------------------------------------------------------
     IMPORT / EXPORT
  ------------------------------------------------------------------*/
  const exportTemplates = () => {
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apysky-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTemplates = () => {
    try {
      // Validar que el contenido no esté vacío
      if (!importData.trim()) {
        throw new Error('No se ha seleccionado ningún archivo');
      }

      // Parsear el JSON
      const imported = JSON.parse(importData);
      
      // Validar estructura del JSON
      if (!Array.isArray(imported)) {
        throw new Error('El archivo no contiene un array de plantillas válido');
      }

      // Validar cada plantilla
      const validTemplates = imported.filter(t => {
        if (!t || typeof t !== 'object') return false;
        if (!t.name || typeof t.name !== 'string' || t.name.trim().length < 1) return false;
        if (!t.content || typeof t.content !== 'string' || t.content.trim().length < 1) return false;
        return true;
      });

      if (validTemplates.length === 0) {
        throw new Error('No se encontraron plantillas válidas en el archivo');
      }

      // Verificar duplicados
      const existingIds = new Set(templates.map(t => t.id));
      const newTemplates = validTemplates.map(template => ({
        ...template,
        id: template.id ? template.id : Date.now().toString(),
        createdAt: template.createdAt || new Date().toISOString()
      })).filter(template => !existingIds.has(template.id));

      const updatedTemplates = [...templates, ...newTemplates];
      
      // Guardar en estado y almacenamiento
      setTemplates(updatedTemplates);
      setStorageData({ templates: updatedTemplates });

      // Mostrar notificación de éxito
      showNotification(
        'Importación Exitosa',
        `Se importaron ${newTemplates.length} plantillas correctamente`
      );

      setImportData('');
      setImportExportOpen(false);

    } catch (error) {
      console.error('Error al importar plantillas:', error);
      
      // Mostrar notificación de error
      showNotification('Error de Importación', error.message);
    }
  };

  useEffect(() => {
    checkWhatsAppConnection();
  }, [checkWhatsAppConnection]);

  return (
    <div style={{ padding: '15px', width: '400px', fontFamily: 'Arial', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      {/* Estilos Quill */}
      <style>{customStyles}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#b30000' }}>APY Sky</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleToggleScheduled}
            style={{
              padding: '8px 16px',
              backgroundColor: showScheduled ? '#b30000' : '#f0f0f0',
              color: showScheduled ? 'white' : '#333',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>Programados</span>
            {scheduledMessages.length > 0 && (
              <span style={{
                backgroundColor: '#b30000',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '12px',
                minWidth: '20px',
                textAlign: 'center',
              }}>{scheduledMessages.length}</span>
            )}
          </button>
          <button
            onClick={handleToggleTemplates}
            style={{
              padding: '8px 16px',
              backgroundColor: showTemplates ? '#b30000' : '#f0f0f0',
              color: showTemplates ? 'white' : '#333',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Plantillas
          </button>
        </div>
      </div>
      <div
        style={{
          marginBottom: '10px',
          fontSize: '12px',
          color: connectionStatus.isConnected ? 'green' : '#b30000',
        }}
      >
        {connectionStatus.isConnected
          ? 'Conectado a WhatsApp Web'
          : connectionStatus.error || 'No conectado a WhatsApp Web'}
      </div>

      {/* CUERPO */}
      {/* ------ Módulo Programados ------ */}
      {showScheduled ? (
        /* Lista de programados */
        <div style={{ flexGrow: 1, marginBottom: '15px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Mensajes Programados</h3>
            <button
              onClick={() => setShowScheduled(false)}
              style={{
                background: '#b30000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>←</span> Volver
            </button>
          </div>

          {scheduledMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No hay mensajes programados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scheduledMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '10px',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div>
                      <strong style={{ color: '#b30000', display: 'block' }}>{msg.name}</strong>
                      <small style={{ color: '#888', fontSize: '11px' }}>
                        Programado para: {formatDateTime(new Date(msg.scheduledTime))}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span
                        style={{
                          background: '#e6f7ff',
                          color: '#1890ff',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {getTimeRemaining(new Date(msg.scheduledTime))}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelScheduledMessage(msg.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff4d4f',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Cancelar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      color: '#333',
                      fontSize: '13px',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed #eee',
                      maxHeight: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />

                  <div
                    style={{
                      fontSize: '11px',
                      color: '#666',
                      marginTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {msg.numbers.length} contacto{msg.numbers.length > 1 ? 's' : ''}
                    </span>
                    <span>Creado: {new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : /* ------ Módulo Plantillas ------ */ showTemplates ? (
        /* Lista plantillas */
        <div style={{ flexGrow: 1, marginBottom: '15px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
            <h4 style={{ margin: 0, color: '#333' }}>Tus Plantillas</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setImportExportOpen(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid #b30000',
                  color: '#b30000',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Importar/Exportar"
              >
                <span>🔄</span>
              </button>
              <button
                onClick={() => setShowTemplates(false)}
                style={{
                  background: '#b30000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>←</span> Volver
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateModal(true);
            }}
            style={{
              width: '100%',
              marginBottom: '15px',
              padding: '8px',
              backgroundColor: '#f0f0f0',
              border: '1px dashed #b30000',
              color: '#b30000',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <span>+</span> Crear Nueva Plantilla
          </button>

          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No hay plantillas guardadas. Crea tu primera plantilla.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '10px',
                    backgroundColor: '#f9f9f9',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong style={{ color: '#b30000' }}>{template.name}</strong>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(template);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
                        title="Vista Previa"
                      >
                        👁️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#1890ff', cursor: 'pointer' }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteTemplate(template.id);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      color: '#333',
                      fontSize: '13px',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed #eee',
                      maxHeight: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                    dangerouslySetInnerHTML={{ __html: template.content }}
                  />
                  {template.createdAt && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', textAlign: 'right' }}>
                      Creada: {new Date(template.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ------ Módulo Envío Inmediato ------ */
        <div style={{ marginBottom: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Editor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ color: '#333', fontWeight: 'bold' }}>Mensaje:</label>
            <button
              onClick={() => setShowTemplates(true)}
              style={{
                background: 'transparent',
                border: '1px solid #b30000',
                color: '#b30000',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>📋</span> Plantillas
            </button>
          </div>

          <ReactQuill
            theme="snow"
            value={message}
            onChange={setMessage}
            modules={modules}
            formats={formats}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '15px' }}
          />

          {/* Números */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
              Números (uno por línea):
            </label>
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value.replace(/,\s*/g, '\n'))}
              placeholder="Ej: +51987654321\n+51987654322"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '1px solid #b30000',
                borderRadius: '4px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Fecha programada */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
              Programar envío (opcional):
            </label>
            <DatePicker
              selected={scheduleDate}
              onChange={setScheduleDate}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={5}
              dateFormat="dd/MM/yyyy HH:mm"
              minDate={new Date()}
              className="custom-datepicker"
              wrapperClassName="datepicker-wrapper"
              customInput={
                <input
                  style={{
                    padding: '8px',
                    border: '1px solid #b30000',
                    borderRadius: '4px',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                  readOnly
                />
              }
            />
          </div>

          {/* Tiempo entre mensajes */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ color: '#333', fontWeight: 'bold' }}>
                Tiempo entre mensajes:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={delayBetweenMessages}
                  onChange={(e) => setDelayBetweenMessages(Math.max(1, Math.min(60, Number(e.target.value))))}
                  style={{
                    width: '60px',
                    padding: '4px 8px',
                    border: '1px solid #b30000',
                    borderRadius: '4px',
                    textAlign: 'center'
                  }}
                />
                <span>segundos</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Tiempo de espera entre cada mensaje para evitar bloqueos
            </div>
          </div>

          {/* BOTONES */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={async () => {
                // Restablecer la fecha al momento actual para envío inmediato
                setScheduleDate(new Date());
                
                // Obtener números de teléfono
                const phoneNumbers = parseNumbers(numbers);
                
                if (phoneNumbers.length === 0) {
                  setSendStatus({ success: false, message: 'No hay números de teléfono válidos' });
                  return;
                }
                
                // Mostrar confirmación
                if (window.confirm(`¿Estás seguro de enviar este mensaje a ${phoneNumbers.length} contactos?`)) {
                  await sendBulkMessages(phoneNumbers, message);
                }
              }}
              disabled={!message.trim() || !hasValidNumbers(numbers) || isSending}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor:
                  !message.trim() || !hasValidNumbers(numbers) || isSending
                    ? '#ccc'
                    : '#b30000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  !message.trim() || !hasValidNumbers(numbers) || isSending
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>✉️</span> {isSending ? 'Enviando...' : 'Enviar Ahora'}
            </button>
            
            <button
              onClick={async () => {
                const phoneNumbers = parseNumbers(numbers);

                if (phoneNumbers.length === 0) {
                  setSendStatus({ success: false, message: 'No hay números de teléfono válidos' });
                  return;
                }

                if (window.confirm(`¿Estás seguro de programar este mensaje para ${formatDateTime(scheduleDate)}?`)) {
                  await scheduleMessage({
                    numbers: phoneNumbers,
                    content: message,
                    scheduledTime: scheduleDate,
                  });

                  setSendStatus({
                    success: true,
                    message: `Mensaje programado para ${formatDateTime(scheduleDate)}`,
                  });
                }
              }}
                disabled={!message.trim() || !hasValidNumbers(numbers) || isSending}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f9f0ff',
                color: '#722ed1',
                border: '1px solid #d3adf7',
                borderRadius: '4px',
                  cursor:
                    !message.trim() || !hasValidNumbers(numbers) || isSending
                      ? 'not-allowed'
                      : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              title="Programar para más tarde"
            >
              <span>⏰</span> Programar
              </button>
            </div>
            {sendStatus.message && (
              <div
                style={{
                  marginTop: '10px',
                  color:
                    sendStatus.success === null
                      ? '#333'
                      : sendStatus.success
                        ? 'green'
                        : 'red',
                }}
              >
                {sendStatus.message}
              </div>
            )}
          </div>
        )}

      {/* -----------------------------------------------------------
         MODALES AUXILIARES
      ------------------------------------------------------------*/}
      {/* Vista previa */}
      {previewTemplate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setPreviewTemplate(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ×
            </button>
            <h3 style={{ color: '#b30000', marginTop: 0 }}>{previewTemplate.name}</h3>
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: '4px',
                padding: '15px',
                marginTop: '10px',
                backgroundColor: '#fafafa',
                minHeight: '100px',
              }}
              dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
            />
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setPreviewTemplate(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  applyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#b30000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Usar esta plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import / export */}
      {importExportOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <h3 style={{ color: '#b30000', marginTop: 0 }}>Importar/Exportar Plantillas</h3>

            {/* Export */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px' }}>Exportar Plantillas</h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Guarda una copia de seguridad de tus plantillas en un archivo JSON.
              </p>
              <button
                onClick={exportTemplates}
                disabled={templates.length === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: templates.length === 0 ? '#f0f0f0' : '#b30000',
                  color: templates.length === 0 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: templates.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⬇️</span> Exportar ({templates.length})
              </button>
            </div>

            {/* Import */}
            <div>
              <h4 style={{ marginBottom: '10px' }}>Importar Plantillas</h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Importa plantillas desde un archivo JSON. Las que ya existan no se sobrescribirán.
              </p>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Pega aquí el JSON..."
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setImportData(ev.target.result);
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  <span>📁</span> Seleccionar Archivo
                </button>

                <button
                  onClick={importTemplates}
                  disabled={!importData.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: !importData.trim() ? '#f0f0f0' : '#b30000',
                    color: !importData.trim() ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !importData.trim() ? 'not-allowed' : 'pointer',
                    flex: 1,
                  }}
                >
                  <span>⬆️</span> Importar
                </button>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setImportExportOpen(false);
                  setImportData('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA/EDITAR PLANTILLA */}
      {showTemplateModal && (
        <TemplateModal
          isOpen={showTemplateModal}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={saveTemplate}
          template={editingTemplate}
        />
      )}
    </div>
  );
}
export default Popup;
