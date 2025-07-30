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
  const [selectedImage, setSelectedImage] = useState(null);   // File
  const [previewUrl, setPreviewUrl] = useState('');           // DataURL

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


  // ------------------- LÓGICA DE ENVÍO DE IMÁGENES -------------------
  
  // Manejar selección de imagen
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedImage(file);
    
    // Crear vista previa
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Resetear el input para permitir seleccionar la misma imagen de nuevo
    e.target.value = '';
  };
  
  // Limpiar imagen seleccionada
  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setMessage(''); // Limpiar el mensaje cuando se quita la imagen
    // Enfocar el editor después de limpiar la imagen
    setTimeout(() => {
      const editor = document.querySelector('.ql-editor');
      if (editor) {
        editor.focus();
      }
    }, 0);
  };
  
  // Enviar imagen a todos los números
  const sendImageToAll = async () => {
    if (!selectedImage) return;
    const nums = parseNumbers(numbers);
    if (!nums.length) {
      setSendStatus({ success: false, message: 'Agrega números antes de enviar' });
      return;
    }
    
    // Limpiar el mensaje después de enviar la imagen
    const currentMessage = message;
    setMessage('');

    setIsSending(true);
    let ok = 0, fail = 0;

    for (const [idx, num] of nums.entries()) {
      try {
        await handleSendImage(num, selectedImage, cleanHtml(currentMessage));
        ok++;
      } catch (error) {
        console.error(`APYSKY: Error al enviar a ${num}:`, error);
        fail++;
      }
      
      // Pausa mínima para no saturar
      if (idx < nums.length - 1) await new Promise(r => setTimeout(r, 800));
      
      // Actualizar estado
      setSendStatus({
        success: null,
        message: `Enviando... (${ok + fail}/${nums.length})`
      });
    }

    setIsSending(false);
    setSendStatus({
      success: fail === 0,
      message: `Imágenes enviadas. Éxitos: ${ok} | Fallos: ${fail}`
    });
    
    // Limpiar la imagen después de enviar
    setSelectedImage(null);
    setPreviewUrl('');
  };
  
  // Función para enviar una sola imagen
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

  // ------------------- MANEJO DE ENVÍO -------------------
  
  // Limpiar HTML para mensajes de texto
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
      <style>{`
        /* Estilos para la carga de imágenes */
        .image-upload-section {
          margin: 15px 0;
        }
        
        .upload-area {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 5px;
        }
        
        .upload-area:hover {
          border-color: #b30000;
          background-color: #fff9f9;
        }
        
        .upload-placeholder {
          color: #666;
        }
        
        .upload-placeholder span {
          font-size: 24px;
          display: block;
          margin-bottom: 5px;
        }
        
        .image-preview {
          position: relative;
          margin-top: 10px;
          border: 1px solid #eee;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .preview-image {
          max-width: 100%;
          max-height: 200px;
          display: block;
          margin: 0 auto;
        }
        
        .image-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 10px;
          background-color: #f9f9f9;
          border-top: 1px solid #eee;
        }
        
        .remove-image-btn {
          background: #ffebee;
          border: 1px solid #ffcdd2;
          color: #c62828;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
        
        .remove-image-btn:hover {
          background: #ffcdd2;
        }
        
        .image-info {
          font-size: 0.85em;
          color: #666;
          margin-left: 10px;
        }
        
        /* Ajustes para el formulario */
        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 5px;
        }
        
        .quill-disabled-message {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 20px;
          color: #666;
          background-color: #f9f9f9;
          border: 1px dashed #ddd;
          border-radius: 4px;
        }
        
        .quill-disabled-message p {
          margin: 5px 0;
        }
      `}</style>

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
          <div className="form-group">
            <label>Números de teléfono (separados por comas o saltos de línea):</label>
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={4}
              placeholder="Ej: +51987654321, +51987654322"
            />
            
            {/* Sección de carga de imagen */}
            <div className="image-upload-section">
              <label>Imagen a enviar (opcional):</label>
              {previewUrl ? (
                <div className="image-preview">
                  <img src={previewUrl} alt="Vista previa" className="preview-image" />
                  <div className="image-actions">
                    <button 
                      type="button" 
                      onClick={clearImage}
                      className="remove-image-btn"
                      title="Quitar imagen"
                    >
                      ×
                    </button>
                    <span className="image-info">
                      {selectedImage.name} ({(selectedImage.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>Pie de foto (opcional):</label>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Escribe un mensaje para acompañar la imagen"
                      className="form-control"
                    />
                  </div>
                </div>
              ) : (
                <div className="upload-area" onClick={() => document.getElementById('image-upload').click()}>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-placeholder">
                    <span>+</span>
                    <p>Haz clic para seleccionar una imagen</p>
                  </div>
                </div>
              )}
            </div>
          </div>
<>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!selectedImage) {
                  // Lógica para enviar solo mensaje de texto
                  const phoneNumbers = parseNumbers(numbers);
                  if (window.confirm(`¿Estás seguro de enviar este mensaje a ${phoneNumbers.length} ${phoneNumbers.length === 1 ? 'contacto' : 'contactos'}?`)) {
                    sendBulkMessages(numbers, message);
                  }
                } else {
                  // Lógica para enviar imagen
                  sendImageToAll();
                }
              }}
              disabled={isSending || isLoading || !isWhatsAppReady || !hasValidNumbers(numbers) || (!selectedImage && !message.trim())}
              className="send-button"
              style={{
                backgroundColor: selectedImage ? '#4CAF50' : '#b30000',
                marginTop: '10px',
                width: '100%'
              }}
            >
              {isSending 
                ? 'Enviando...' 
                : selectedImage 
                  ? `Enviar Imagen${parseNumbers(numbers).length > 1 ? 'es' : ''} (${parseNumbers(numbers).length})` 
                  : `Enviar Mensaje${parseNumbers(numbers).length > 1 ? 's' : ''} (${parseNumbers(numbers).length})`}
            </button>
            

          </>
          
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
          {!previewUrl ? (
            <ReactQuill
              theme="snow"
              value={message}
              onChange={setMessage}
              modules={modules}
              formats={formats}
              placeholder="Escribe tu mensaje aquí..."
            />
          ) : (
            <div className="quill-disabled-message">
              <p>El editor está deshabilitado mientras tengas una imagen seleccionada.</p>
              <p>Puedes agregar un pie de foto en el campo de texto superior.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Popup;
