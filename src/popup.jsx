import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import './popup.css';

/* ------------------------------------------------------------------
  UTILIDADES
-------------------------------------------------------------------*/
const formatDateTime = (date) =>
  date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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

const phoneRegex = /^\+?\d{6,15}$/;
const parseNumbers = (text) => text.split(/[\n,\s]+/).filter(Boolean);
const hasValidNumbers = (text) => {
  const nums = parseNumbers(text);
  return nums.length > 0 && nums.every((n) => phoneRegex.test(n));
};

/* ------------------------------------------------------------------
  MODAL PLANTILLAS
-------------------------------------------------------------------*/
const TemplateModal = ({ isOpen, onClose, onSave, template = null }) => {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
    } else {
      setName('');
      setContent('');
    }
  }, [template]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#b30000' }}>
          {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
        </h3>

        {/* Nombre */}
        <div style={{ marginBottom: '15px' }}>
          <label
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Nombre de la plantilla:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            placeholder="Ej: Recordatorio de pago"
          />
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '15px' }}>
          <label style={{ marginBottom: '5px', fontWeight: 'bold' }}>Contenido:</label>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean'],
              ],
            }}
            formats={[
              'header',
              'bold',
              'italic',
              'underline',
              'strike',
              'list',
              'bullet',
              'link',
              'image',
            ]}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ id: template?.id, name, content })}
            disabled={!name.trim() || !content.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor:
                !name.trim() || !content.trim() ? '#ccc' : '#b30000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor:
                !name.trim() || !content.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {template ? 'Actualizar' : 'Guardar'} Plantilla
          </button>
        </div>
      </div>
    </div>
  );
};

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

/* ------------------------------------------------------------------
  COMPONENTE PRINCIPAL
-------------------------------------------------------------------*/
function Popup() {
  /* --------------------
     ESTADOS CONEXIÓN WA
  ---------------------*/
  const [isWhatsAppReady, setIsWhatsAppReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /* --------------------
     ESTADOS ENVÍO
  ---------------------*/
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({ success: null, message: '' });

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

  /* --------------------
     CONFIG EDITOR
  ---------------------*/
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'link',
    'image',
    'color',
    'background',
  ];

  /* ------------------------------------------------------------------
    HELPERS EXTENSIÓN
  ------------------------------------------------------------------*/
  const isExtensionEnvironment = () =>
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;

  // ------------------- VERIFICAR CONEXIÓN -------------------
  const checkWhatsAppStatus = useCallback(async () => {
    if (!isExtensionEnvironment()) {
      console.log('APYSKY: No es un entorno de extensión. Simulando conexión.');
      setIsLoading(false);
      setIsWhatsAppReady(true); // En desarrollo, asumimos que está listo.
      return;
    }

    try {
      setIsLoading(true);
      const response = await chrome.runtime.sendMessage({ action: 'GET_WHATSAPP_STATUS' });
      if (response && response.tabId) {
        console.log('APYSKY: Estado de WhatsApp recibido:', response);
        setIsWhatsAppReady(response.isWhatsAppReady);
      } else {
        console.error('APYSKY: Respuesta inválida del background al verificar estado.');
        setIsWhatsAppReady(false);
      }
    } catch (error) {
      console.error('APYSKY: Error al verificar la conexión con WhatsApp Web:', error);
      setIsWhatsAppReady(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar estado al iniciar
  useEffect(() => {
    checkWhatsAppStatus();
    // También podrías añadir un listener para actualizaciones en tiempo real si fuera necesario
    // chrome.runtime.onMessage.addListener(...);
  }, [checkWhatsAppStatus]);


  // ------------------- LÓGICA DE ENVÍO -------------------
  
  function cleanHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }

  const sendBulkMessages = async (phoneNumbersText, messageText) => {
    if (!isExtensionEnvironment()) {
      alert(`Simulando envío a:\n${phoneNumbersText}\n\nMensaje:\n${messageText}`);
      return;
    }

    const phoneNumbers = parseNumbers(phoneNumbersText);
    if (phoneNumbers.length === 0) {
      setSendStatus({ success: false, message: 'No hay números válidos para enviar.' });
      return;
    }

    setIsSending(true);
    setSendStatus({ success: null, message: `Enviando ${phoneNumbers.length} mensajes...` });

    let successCount = 0;
    let errorCount = 0;
    
    for (const [index, number] of phoneNumbers.entries()) {
      const cleanNumber = number.replace(/\D/g, '');
      const cleanedMessage = cleanHtml(messageText); // Limpiamos el mensaje aquí.
       setSendStatus({ success: null, message: `Enviando a ${cleanNumber} (${index + 1}/${phoneNumbers.length})` });
      try {
        console.log(`APYSKY: Iniciando envío a ${cleanNumber}`);
        const response = await chrome.runtime.sendMessage({
          action: 'SEND_MESSAGE',
          payload: { to: cleanNumber, message: cleanedMessage }
        });
        
        console.log("APYSKY: Respuesta recibida:", response);

        if (response && response.success) {
          console.log(`APYSKY: Mensaje a ${cleanNumber} enviado con éxito.`);
          successCount++;
        } else {
          console.error(`APYSKY: Error al enviar mensaje a ${cleanNumber}:`, response?.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`APYSKY: Error catastrófico al enviar a ${cleanNumber}:`, error);
        errorCount++;
      }
      
      // Pausa entre mensajes para no saturar
      if (index < phoneNumbers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsSending(false);
    setSendStatus({
      success: errorCount === 0,
      message: `Envío completado. Éxitos: ${successCount}. Fallos: ${errorCount}.`
    });
  };

  /* ------------------------------------------------------------------
     USEEFFECTS
   ------------------------------------------------------------------*/
  useEffect(() => {
    checkWhatsAppStatus();

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
  }, [checkWhatsAppStatus]);

  /* ------------------------------------------------------------------
     STORAGE HELPERS
  ------------------------------------------------------------------*/
  const getStorageData = async (keys) => {
    if (isExtensionEnvironment()) return chrome.storage.local.get(keys);

    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value !== null) result[key] = JSON.parse(value);
      });
    } else if (typeof keys === 'string') {
      const value = localStorage.getItem(keys);
      if (value !== null) result[keys] = JSON.parse(value);
    } else if (keys === null) {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        result[key] = JSON.parse(localStorage.getItem(key));
      }
    }
    return result;
  };

  const setStorageData = async (data) => {
    if (isExtensionEnvironment()) return chrome.storage.local.set(data);

    Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
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
  const sendScheduledMessage = async () => {
    if (!isExtensionEnvironment()) return;

    const now = new Date();
    const { scheduledMessages: messages = [] } = await getStorageData('scheduledMessages');

    const messagesToSend = messages.filter((msg) => new Date(msg.scheduledTime) <= now);
    const remainingMessages = messages.filter((msg) => new Date(msg.scheduledTime) > now);

    if (messagesToSend.length) {
      await Promise.all(messagesToSend.map(async (msg) => {
        try {
          const [tab] = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
          if (!tab) throw new Error('No se encontró una pestaña de WhatsApp Web abierta');

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (n, m) => window.postMessage({ type: 'APYSKY_SEND', numeros: n, mensaje: m }, '*'),
            args: [msg.numbers, msg.content],
          });
          return { ...msg, sentAt: new Date().toISOString() };
        } catch (error) {
          console.error(`Error al enviar mensaje programado con ID ${msg.id}:`, error);
          return { ...msg, error: error.message || 'Error desconocido' };
        }
      }));
      await setStorageData({ scheduledMessages: remainingMessages });
      setScheduledMessages(remainingMessages);

      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Mensajes Enviados',
          message: `Se han enviado ${messagesToSend.length} mensajes programados`,
        });
      }
    }
  };

  const checkScheduledMessages = async () => {
    try {
      if (!isExtensionEnvironment()) {
        console.log('Simulando verificación de mensajes programados');
        return;
      }

      // Obtener mensajes programados desde el background script
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SCHEDULED_MESSAGES'
      });

      if (response && response.success) {
        // Actualizar el estado con los mensajes programados
        setScheduledMessages(response.data || []);
      } else {
        console.error('Error al obtener mensajes programados:', response?.error);
      }
    } catch (error) {
      console.error('Error al verificar mensajes programados:', error);
    }
  };

  /* ------------------------------------------------------------------
     ENVÍO INMEDIATO / PROGRAMAR VIA UI
  ------------------------------------------------------------------*/

  const scheduleMessage = async ({ numbers: nums, content, scheduledTime }) => {
    try {
      if (!isExtensionEnvironment()) {
        console.log('Simulando programación de mensaje');
        return { success: true };
      }

      const phoneNumbers = parseNumbers(nums);
      if (!phoneNumbers.length) {
        throw new Error('No hay números de teléfono válidos');
      }

      setIsSending(true);
      setSendStatus({ success: null, message: `Programando ${phoneNumbers.length} mensajes...` });

      const results = [];
      let successCount = 0;

      for (const phone of phoneNumbers) {
        try {
          // Limpiar el número de teléfono
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          
          // Programar el mensaje a través del background script
          const response = await chrome.runtime.sendMessage({
            action: 'SCHEDULE_MESSAGE',
            payload: {
              to: cleanPhone,
              message: content,
              scheduledDate: scheduledTime.toISOString(),
              delay: delayBetweenMessages
            }
          });

          results.push({
            phone,
            success: response.success,
            data: response.data,
            error: response.error
          });

          if (response.success) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error al programar mensaje para ${phone}:`, error);
          results.push({
            phone,
            success: false,
            error: error.message || 'Error desconocido'
          });
        }
      }

      const finalMessage = `
        Programación completada:
        • Total: ${phoneNumbers.length}
        • Exitosos: ${successCount}
        • Fallidos: ${phoneNumbers.length - successCount}
        • Fecha programada: ${formatDateTime(scheduledTime)}
      `;

      setSendStatus({
        success: successCount > 0,
        message: finalMessage
      });

      // Actualizar la lista de mensajes programados
      await checkScheduledMessages();

      return { success: successCount > 0, results };
    } catch (error) {
      console.error('Error al programar mensajes:', error);
      setSendStatus({
        success: false,
        message: `Error: ${error.message || 'Error desconocido'}`
      });
      return { success: false, error: error.message };
    } finally {
      setIsSending(false);
    }
  };

  const cancelScheduledMessage = async (id) => {
    try {
      if (!isExtensionEnvironment()) {
        console.log('Simulando cancelación de mensaje programado');
        return { success: true };
      }

      // Eliminar el mensaje programado a través del background script
      const response = await chrome.runtime.sendMessage({
        action: 'DELETE_SCHEDULED_MESSAGE',
        payload: { id }
      });

      if (response && response.success) {
        // Actualizar la lista de mensajes programados
        await checkScheduledMessages();
        return { success: true };
      } else {
        throw new Error(response?.error || 'Error al cancelar el mensaje programado');
      }
    } catch (error) {
      console.error('Error al cancelar mensaje programado:', error);
      return { success: false, error: error.message };
    }
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
      const imported = JSON.parse(importData);
      if (!Array.isArray(imported)) throw new Error('El archivo no contiene un array de plantillas válido');
      const valid = imported.filter((t) => t && typeof t === 'object' && 'name' in t && 'content' in t);
      if (!valid.length) throw new Error('No se encontraron plantillas válidas');

      const existingIds = new Set(templates.map((t) => t.id));
      const merged = [...templates, ...valid.filter((t) => !existingIds.has(t.id))];
      setTemplates(merged);
      setStorageData({ templates: merged });
      setImportData('');
      setImportExportOpen(false);
      alert(`Se importaron ${valid.length} plantillas correctamente`);
    } catch (error) {
      console.error('Error al importar plantillas:', error);
      alert(`Error al importar plantillas: ${error.message}`);
    }
  };

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------*/
  return (
    <div style={{ padding: '15px', width: '400px', fontFamily: 'Arial', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      {/* Estilos Quill */}
      <style>{customStyles}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ color: '#b30000', margin: 0 }}>Apysky</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowScheduled((v) => !v)}
            style={{
              background: showScheduled ? '#b30000' : 'transparent',
              border: '1px solid #b30000',
              color: showScheduled ? 'white' : '#b30000',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>⏰</span>
            {showScheduled ? 'Ocultar' : 'Ver'} Programados
          </button>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            style={{
              background: showTemplates ? '#b30000' : 'transparent',
              border: '1px solid #b30000',
              color: showTemplates ? 'white' : '#b30000',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>📋</span>
            {showTemplates ? 'Ocultar' : 'Ver'} Plantillas
          </button>
        </div>
      </div>
      <div className="status-bar">
        <span
          className={`status-dot ${
            isLoading ? 'loading' : isWhatsAppReady ? 'connected' : 'disconnected'
          }`}
        ></span>
        <span>
          {isLoading
            ? 'Verificando conexión...'
            : isWhatsAppReady
            ? 'Conectado a WhatsApp'
            : 'No se pudo conectar a WhatsApp'}
        </span>
        <button onClick={checkWhatsAppStatus} disabled={isLoading} className="refresh-btn">
          ↻
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="main-content">
        <div className="left-panel">
          {/* ... aquí va la lógica de las pestañas ... */}
          <div className="tab-content">
              <textarea
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                placeholder="Introduce los números de teléfono aquí, uno por línea o separados por comas."
                className="numbers-textarea"
              />
          </div>
          
          <button
            onClick={() => {
                const phoneNumbers = parseNumbers(numbers);
                if (window.confirm(`¿Estás seguro de enviar este mensaje a ${phoneNumbers.length} contactos?`)) {
                  sendBulkMessages(numbers, message);
                }
            }}
            disabled={isSending || isLoading || !isWhatsAppReady || !hasValidNumbers(numbers)}
            className="send-button"
          >
            {isSending ? 'Enviando...' : 'Enviar Mensaje(s)'}
          </button>
          
          {sendStatus.message && (
            <div
              className={`send-status ${
                sendStatus.success === true
                  ? 'success'
                  : sendStatus.success === false
                  ? 'error'
                  : ''
              }`}
            >
              {sendStatus.message}
            </div>
          )}
        </div>
        <div className="right-panel">
          <ReactQuill
            theme="snow"
            value={message}
            onChange={setMessage}
            modules={modules}
            formats={formats}
          />
        </div>
      </div>
    </div>
  );
}

export default Popup;
