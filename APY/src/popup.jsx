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

  /* ------------------------------------------------------------------
    CONEXIÓN WHATSAPP WEB
  ------------------------------------------------------------------*/
  const checkWhatsAppConnection = useCallback(async () => {
    if (!isExtensionEnvironment()) {
      setConnectionStatus((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: 'No se puede conectar con WhatsApp Web en este entorno',
      }));
      return;
    }

    setConnectionStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await chrome.runtime.sendMessage({ action: 'CHECK_CONNECTION' });
      setConnectionStatus({
        isConnected: response.isConnected,
        isLoading: false,
        error: null,
        whatsAppTab: response.tabId ? { id: response.tabId } : null,
      });
    } catch (error) {
      console.error('Error al verificar la conexión con WhatsApp Web:', error);
      setConnectionStatus({
        isConnected: false,
        isLoading: false,
        error: 'Error al conectar con WhatsApp Web',
        whatsAppTab: null,
      });
    }
  }, []);

  const openWhatsAppWeb = async () => {
    if (!isExtensionEnvironment()) {
      window.open('https://web.whatsapp.com', '_blank');
      return;
    }

    setConnectionStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await chrome.runtime.sendMessage({ action: 'OPEN_WHATSAPP_WEB' });
      if (response.success) {
        setConnectionStatus({
          isConnected: true,
          isLoading: false,
          error: null,
          whatsAppTab: { id: response.tabId },
        });
      } else {
        throw new Error(response.error || 'Error al abrir WhatsApp Web');
      }
    } catch (error) {
      console.error('Error al abrir WhatsApp Web:', error);
      setConnectionStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Error al abrir WhatsApp Web',
      }));
    }
  };

  const sendWhatsAppMessage = async (phoneNumber, messageText, isLast = true) => {
    const API_URL = 'http://localhost:5000/api/messages';
    
    try {
      setIsSending(true);
      setSendStatus({ success: null, message: `Enviando a ${phoneNumber}...` });
      
      // Enviar mensaje al backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: messageText,
          scheduledDate: new Date().toISOString(), // Enviar inmediatamente
          delay: delayBetweenMessages
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el mensaje');
      }
      
      const statusMessage = `Mensaje programado para ${phoneNumber} correctamente`;
      setSendStatus({ success: true, message: statusMessage });
      console.log(statusMessage, data);
      
      // Si no es el último mensaje, mostramos un estado de espera
      if (!isLast) {
        setSendStatus({ 
          success: null, 
          message: `Esperando ${delayBetweenMessages} segundos antes del siguiente envío...` 
        });
        
        // Esperamos el tiempo configurado antes de permitir el siguiente envío
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages * 1000));
      }
      
      return { success: true, data };
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      const errorMessage = `Error al enviar a ${phoneNumber}: ${error.message || 'Error desconocido'}`;
      setSendStatus({ success: false, message: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      if (isLast) {
        setIsSending(false);
      }
    }
  };

  // Función para enviar mensajes a múltiples números con intervalo
  const sendBulkMessages = async (phoneNumbers, messageText) => {
    if (!phoneNumbers || !phoneNumbers.length) {
      setSendStatus({ success: false, message: 'No hay números de teléfono para enviar' });
      return { success: false, error: 'No hay números de teléfono' };
    }

    setIsSending(true);
    setSendStatus({ success: null, message: `Iniciando envío a ${phoneNumbers.length} contactos...` });

    let successCount = 0;
    const results = [];

    for (let i = 0; i < phoneNumbers.length; i++) {
      const phone = phoneNumbers[i].trim();
      if (!phone) continue;

      const isLast = i === phoneNumbers.length - 1;
      const result = await sendWhatsAppMessage(phone, messageText, isLast);
      
      results.push({ phone, success: result.success, error: result.error });
      if (result.success) successCount++;

      // Actualizamos el estado con el progreso
      setSendStatus(prev => ({
        ...prev,
        message: `Progreso: ${i + 1}/${phoneNumbers.length} enviados (${successCount} exitosos)`
      }));
    }

    const finalMessage = `
      Envío completado: 
      • Total: ${phoneNumbers.length}
      • Exitosos: ${successCount}
      • Fallidos: ${phoneNumbers.length - successCount}
    `;
    
    setSendStatus({
      success: successCount > 0,
      message: finalMessage
    });
    
    setIsSending(false);
    return { success: successCount > 0, results };
  };

  /* ------------------------------------------------------------------
     CARGA INICIAL
  ------------------------------------------------------------------*/
  useEffect(() => {
    checkWhatsAppConnection();

    const handleMessage = (message) => {
      if (message.action === 'WHATSAPP_CONNECTED') {
        setConnectionStatus({
          isConnected: true,
          isLoading: false,
          error: null,
          whatsAppTab: { id: message.tabId },
        });
      } else if (message.action === 'WHATSAPP_DISCONNECTED') {
        setConnectionStatus({
          isConnected: false,
          isLoading: false,
          error: 'Se perdió la conexión con WhatsApp Web',
          whatsAppTab: null,
        });
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
  }, [checkWhatsAppConnection]);

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

  /* ------------------------------------------------------------------
     ENVÍO INMEDIATO / PROGRAMAR VIA UI
  ------------------------------------------------------------------*/
  const handleSend = async (e) => {
    e.preventDefault();

    if (!numbers.trim()) return setSendStatus({ success: false, message: 'Ingresa al menos un número' });
    if (!message.trim()) return setSendStatus({ success: false, message: 'Ingresa un mensaje' });

    const numbersList = numbers.split(/[\n,\s]+/).filter(Boolean);
    if (!numbersList.length) return setSendStatus({ success: false, message: 'No se encontraron números válidos' });

    const now = new Date();
    const isScheduled = scheduleDate > now;

    if (isScheduled) {
      const newMsg = {
        id: Date.now().toString(),
        name: `Mensaje para ${numbersList.length} contacto${numbersList.length > 1 ? 's' : ''}`,
        content: message,
        numbers: numbersList,
        scheduledTime: scheduleDate.toISOString(),
        createdAt: new Date().toISOString(),
        status: 'scheduled',
      };

      const updated = [...scheduledMessages, newMsg];
      await setStorageData({ scheduledMessages: updated });
      setScheduledMessages(updated);
      setNumbers('');
      setMessage('');
      setSendStatus({ success: true, message: `Mensaje programado para ${formatDateTime(scheduleDate)}` });
      return;
    }

    /* Envío inmediato */
    try {
      let success = 0;
      let error = 0;
      for (const num of numbersList) {
        const res = await sendWhatsAppMessage(num, message);
        if (res.success) success += 1;
        else error += 1;
        await new Promise((r) => setTimeout(r, 1000)); // pequeño delay
      }
      setSendStatus({ success: error === 0, message: `Enviados: ${success}, Fallidos: ${error}` });
      if (error === 0) {
        setNumbers('');
        setMessage('');
      }
    } catch (err) {
      console.error(err);
      setSendStatus({ success: false, message: 'Error al enviar los mensajes' });
    }
  };

  const scheduleMessage = async () => {
    if (!numbers.trim() || !message.trim()) return alert('Faltan datos');

    const nums = numbers.split('\n').map((n) => n.trim()).filter(Boolean);
    const newMsg = {
      id: Date.now().toString(),
      name: `Mensaje para ${nums.length} contacto${nums.length > 1 ? 's' : ''}`,
      content: message,
      numbers: nums,
      scheduledTime: scheduleDate.toISOString(),
      createdAt: new Date().toISOString(),
      status: 'scheduled',
    };

    const updated = [...scheduledMessages, newMsg];
    await setStorageData({ scheduledMessages: updated });
    setScheduledMessages(updated);
    setNumbers('');
    setMessage('');

    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Mensaje Programado',
        message: `Mensaje programado para ${formatDateTime(scheduleDate)}`,
      });
    }
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
              onChange={(e) => setNumbers(e.target.value)}
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
                const phoneNumbers = numbers
                  .split('\n')
                  .map(num => num.trim())
                  .filter(num => num);
                
                if (phoneNumbers.length === 0) {
                  setSendStatus({ success: false, message: 'No hay números de teléfono válidos' });
                  return;
                }
                
                // Mostrar confirmación
                if (window.confirm(`¿Estás seguro de enviar este mensaje a ${phoneNumbers.length} contactos?`)) {
                  await sendBulkMessages(phoneNumbers, message);
                }
              }}
              disabled={!message.trim() || !numbers.trim() || isSending}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor:
                  !message.trim() || !numbers.trim() || isSending
                    ? '#ccc'
                    : '#b30000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  !message.trim() || !numbers.trim() || isSending
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
                // Obtener números de teléfono
                const phoneNumbers = numbers
                  .split('\n')
                  .map(num => num.trim())
                  .filter(num => num);
                
                if (phoneNumbers.length === 0) {
                  setSendStatus({ success: false, message: 'No hay números de teléfono válidos' });
                  return;
                }
                
                // Mostrar confirmación
                if (window.confirm(`¿Estás seguro de programar este mensaje para ${formatDateTime(scheduleDate)}?`)) {
                  // Aquí iría la lógica para programar los mensajes
                  setSendStatus({ 
                    success: true, 
                    message: `Mensaje programado para ${formatDateTime(scheduleDate)}` 
                  });
                }
              }}
              disabled={!message.trim() || !numbers.trim() || isSending}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f9f0ff',
                color: '#722ed1',
                border: '1px solid #d3adf7',
                borderRadius: '4px',
                cursor:
                  !message.trim() || !numbers.trim() || isSending
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
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setEditingTemplate(null);
        }}
        onSave={saveTemplate}
        template={editingTemplate}
      />
    </div>
  );
}

export default Popup;
