import React, { useState, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import 'react-datepicker/dist/react-datepicker.css';
import './popup.css';

// Componentes
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import ImageUpload from './components/ImageUpload';
import MessageEditor from './components/MessageEditor';
import MultiMessageEditor from './components/MultiMessageEditor';
import SendButton from './components/SendButton';
import SendStatus from './components/SendStatus';
import TemplateModal from './components/TemplateModal';
import TemplatesSection from './components/TemplatesSection';
import NotificationSystem from './components/NotificationSystem';
import ContactManager from './components/ContactManager';


// Hooks
import useWhatsApp from './hooks/useWhatsApp';
import useNotifications from './hooks/useNotifications';

// Utilidades
import { validatePhoneNumbers, getPhoneNumberStats } from './utils/phoneValidator';

/* ------------------------------------------------------------------
  UTILIDADES
-------------------------------------------------------------------*/
const parseNumbers = (text) => text.split(/[\n,\s]+/).filter(Boolean);
const hasValidNumbers = (text) => {
  const validation = validatePhoneNumbers(text);
  return validation.isValid && validation.validCount > 0;
};

/* ------------------------------------------------------------------
  COMPONENTE PRINCIPAL
-------------------------------------------------------------------*/
function Popup() {
  console.log('🚀 APYSKY: Componente Popup COMPLETO iniciando...');
  
  // Sistema de notificaciones
  const {
    notifications,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useNotifications();

  // Hook personalizado para WhatsApp
  const {
    isWhatsAppReady,
    isLoading,
    isSending,
    setIsSending,  // ✅ Get setIsSending to force reset
    sendStatus,
    setSendStatus,
    checkWhatsAppStatus,
    sendMessage,
    sendImage,
    retryCount
  } = useWhatsApp({ showSuccess, showError, showWarning, showInfo });

  // Estados del formulario
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Estados de UI
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const [showContactManager, setShowContactManager] = useState(false);

  
  // 🚫 Estado para restricción de pestaña WhatsApp
  const [isOnWhatsAppTab, setIsOnWhatsAppTab] = useState(false);
  
  // 🚀 NUEVO: Estado para modo Multi-Sección
  const [isMultiSectionMode, setIsMultiSectionMode] = useState(false);
  const [messageSections, setMessageSections] = useState([]);

  // Estados para plantillas dinámicas
  const [templates, setTemplates] = useState([]);

  // Cargar plantillas al iniciar
  useEffect(() => {
    loadTemplates();
  }, []);

  // 🚫 Verificar si estamos en pestaña de WhatsApp Web
  useEffect(() => {
    const checkWhatsAppTab = async () => {
      try {
        // Obtener pestaña actual
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const isWhatsApp = currentTab.url.includes('web.whatsapp.com');
        setIsOnWhatsAppTab(isWhatsApp);
        
        if (!isWhatsApp) {
          console.log('⚠️ APYSKY: No estás en WhatsApp Web. URL actual:', currentTab.url);
      }
    } catch (error) {
        console.error('APYSKY: Error verificando pestaña:', error);
        setIsOnWhatsAppTab(false);
      }
    };

    checkWhatsAppTab();
    
    // Verificar cada vez que la pestaña cambie
    const interval = setInterval(checkWhatsAppTab, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadTemplates = async () => {
    try {
      const result = await chrome.storage.local.get(['templates']);
      const savedTemplates = result.templates || [];
      setTemplates(savedTemplates);
      } catch (error) {
      console.error('Error cargando plantillas:', error);
    }
  };

  // Función para procesar variables de plantillas en el texto
  const processTemplateVariables = (text) => {
    if (!text || templates.length === 0) return text;
    
    let processedText = text;
    
    // Buscar variables entre comillas: "nombrePlantilla"
    const quotedVariables = text.match(/"([^"]+)"/g);
    if (quotedVariables) {
      quotedVariables.forEach(match => {
        const templateName = match.slice(1, -1); // Remover comillas
        const template = templates.find(t => 
          t.name.toLowerCase() === templateName.toLowerCase()
        );
        if (template) {
          const templateContent = template.processedContent || template.content;
          processedText = processedText.replace(match, templateContent);
        }
      });
    }

    // Buscar variables entre paréntesis: (nombrePlantilla)
    const parenthesisVariables = text.match(/\(([^)]+)\)/g);
    if (parenthesisVariables) {
      parenthesisVariables.forEach(match => {
        const templateName = match.slice(1, -1); // Remover paréntesis
        const template = templates.find(t => 
          t.name.toLowerCase() === templateName.toLowerCase()
        );
        if (template) {
          const templateContent = template.processedContent || template.content;
          processedText = processedText.replace(match, templateContent);
        }
      });
    }

    return processedText;
  };

  // Función para usar plantillas (modo tradicional)
  const handleUseTemplate = (content) => {
    setMessage(content);
  };

  // Función para aplicar variables de plantillas al mensaje actual
  const handleApplyTemplateVariables = () => {
    const processedMessage = processTemplateVariables(message);
    if (processedMessage !== message) {
      setMessage(processedMessage);
      showSuccess('Variables de plantillas aplicadas al mensaje');
    } else {
      showInfo('No se encontraron variables de plantillas en el mensaje');
    }
  };

  // Obtener sugerencias de plantillas para mostrar
  const getTemplateSuggestions = () => {
    return templates.map(t => ({
      name: t.name,
      preview: (t.processedContent || t.content).substring(0, 100) + '...'
    }));
  };

  // Validación de números en tiempo real
  const phoneStats = getPhoneNumberStats(numbers);

  /* ------------------------------------------------------------------
    🚀 FUNCIONES MULTI-SECCIÓN
  ------------------------------------------------------------------*/
  const sendMultipleSections = async (phoneNumbers, sections) => {
    const validNumbers = parseNumbers(phoneNumbers);
    const totalMessages = sections.length * validNumbers.length;
    
    // ✅ Silencioso - sin notificaciones de inicio

    let successCount = 0;
    let errorCount = 0;
    
    // ✅ FLUJO CORRECTO: Para cada número, enviar todas las secciones
    for (let numberIndex = 0; numberIndex < validNumbers.length; numberIndex++) {
      const currentNumber = validNumbers[numberIndex];
      
      console.log(`🚀 APYSKY: Iniciando envío para contacto ${numberIndex + 1}/${validNumbers.length}: ${currentNumber}`);

      // Enviar todas las secciones a este número
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        const processedText = processTemplateVariables(section.text);
        
        console.log(`📝 APYSKY: Enviando sección ${sectionIndex + 1}/${sections.length} a ${currentNumber}`);

        try {
          let result;
          if (section.image) {
            // Enviar como imagen con caption
            console.log(`📸 APYSKY: Enviando imagen a ${currentNumber}`);
            result = await sendImage(currentNumber, section.image, processedText);
          } else {
            // Enviar como mensaje de texto
            console.log(`💬 APYSKY: Enviando texto a ${currentNumber}`);
            result = await sendMessage(currentNumber, processedText);
          }

          console.log(`📊 APYSKY: Resultado para ${currentNumber}:`, result);

          if (result && result.successCount > 0) {
          successCount++;
            console.log(`✅ APYSKY: Éxito para ${currentNumber} - Total éxitos: ${successCount}`);
        } else {
          errorCount++;
            console.log(`❌ APYSKY: Error para ${currentNumber} - Total errores: ${errorCount}`);
          }

          // Delay entre secciones del mismo contacto (8 segundos para estabilidad)
          if (sectionIndex < sections.length - 1) {
            console.log(`⏳ APYSKY: Esperando 8s entre secciones...`);
            await new Promise(resolve => setTimeout(resolve, 8000)); // ✅ Aumentado a 8s para secciones múltiples
          }

      } catch (error) {
          console.error(`💥 APYSKY: Error crítico enviando a ${currentNumber}:`, error);
        errorCount++;
      }
      }

      // Delay entre contactos (12 segundos) - solo si no es el último contacto
      if (numberIndex < validNumbers.length - 1) {
        console.log(`⏳ APYSKY: Esperando 12s antes del siguiente contacto...`);
        await new Promise(resolve => setTimeout(resolve, 12000)); // ✅ Aumentado a 12s para contactos múltiples
      }
      
      console.log(`🏁 APYSKY: Completado contacto ${numberIndex + 1}/${validNumbers.length}: ${currentNumber}`);
    }

    // ✅ Resumen final simple - sin notificaciones molestas
    // Los mensajes se enviaron, no necesitamos spam de notificaciones

    return { successCount, errorCount, totalMessages };
  };

  /* ------------------------------------------------------------------
    MANEJO DE IMÁGENES
  ------------------------------------------------------------------*/
  const handleImageSelect = (file) => {
    // Validar tamaño de archivo (16MB máximo para WhatsApp)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      showError('La imagen es demasiado grande. WhatsApp tiene un límite de 16MB.', {
        title: 'Imagen Demasiado Grande',
        details: `Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB\nMáximo permitido: 16MB`
      });
      return;
    }

    // Validar formato de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Formato de imagen no soportado. Usa JPG, PNG, GIF o WEBP.', {
        title: 'Formato No Válido',
        details: `Formato detectado: ${file.type}\nFormatos válidos: ${validTypes.join(', ')}`
      });
      return;
    }
    
    setSelectedImage(file);
    
    // Crear vista previa
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.onerror = () => {
      showError('Error al leer el archivo de imagen');
    };
    reader.readAsDataURL(file);
    
    showSuccess(`Imagen cargada: ${file.name}`, {
      title: 'Imagen Seleccionada',
      duration: 3000
    });
  };
  
  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setMessage('');
    
    // Enfocar el editor después de limpiar la imagen
    setTimeout(() => {
      const editor = document.querySelector('.ql-editor');
      if (editor) {
        editor.focus();
      }
    }, 100);
  };

  /* ------------------------------------------------------------------
    MANEJO DE ENVÍO
  ------------------------------------------------------------------*/
  const handleSend = async (e) => {
    e.preventDefault();
    
    // Validaciones previas
    if (!isWhatsAppReady) {
      showWarning('WhatsApp Web no está conectado. Haz clic en actualizar estado.', {
        title: 'WhatsApp No Disponible'
      });
      return;
    }
    
    if (!hasValidNumbers(numbers)) {
      showError('Por favor, ingresa números de teléfono válidos', {
        title: 'Números Inválidos',
        details: 'Formato correcto: +código_país + número\nEjemplo: +51987654321'
      });
        return;
      }

    // 🚀 VALIDACIÓN DIFERENTE SEGÚN EL MODO
    if (isMultiSectionMode) {
      // Validar que hay secciones y al menos una tiene contenido
      if (!messageSections || messageSections.length === 0) {
        showError('Debes crear al menos una sección de mensaje', {
          title: 'Secciones Requeridas'
        });
        return;
      }

      const validSections = messageSections.filter(section => {
        // Validación simple con textarea - sin HTML
        const hasText = section.text && section.text.trim() !== '';
        const hasImage = section.image;
        
        return hasText || hasImage;
      });
      
      if (validSections.length === 0) {
        showError('Al menos una sección debe tener texto o imagen', {
          title: 'Contenido de Secciones Requerido'
        });
        return;
      }
      } else {
      // Validación modo simple
      if (!selectedImage && (!message || message.trim() === '')) {
        showError('Debes escribir un mensaje o seleccionar una imagen', {
          title: 'Contenido Requerido'
        });
        return;
      }
    }

    const phoneCount = parseNumbers(numbers).length;
    const isMultiple = phoneCount > 1;

    // 🚀 LÓGICA DIFERENTE SEGÚN EL MODO
    if (isMultiSectionMode) {
      // Confirmación para modo multi-sección
      const validSections = messageSections.filter(section => {
        // Validación simple con textarea - sin HTML
        const hasText = section.text && section.text.trim() !== '';
        const hasImage = section.image;
        
        return hasText || hasImage;
      });
      
      const totalMessages = validSections.length * phoneCount;
      const confirmMessage = `🚀 MODO MULTI-SECCIÓN\n\n` +
        `¿Enviar ${validSections.length} mensajes a ${phoneCount} ${isMultiple ? 'contactos' : 'contacto'}?\n` +
        `Total de envíos: ${totalMessages}\n\n` +
        `Mensajes:\n${validSections.map((section, i) => 
          `${i + 1}. ${section.image ? '📸 Imagen + ' : ''}${section.text.substring(0, 50)}${section.text.length > 50 ? '...' : ''}`
        ).join('\n')}`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Enviar múltiples secciones
      try {
        const result = await sendMultipleSections(numbers, validSections);
        
        // Limpiar después del envío exitoso
        if (result && result.successCount > 0) {
          setMessageSections([]);
      }
    } catch (error) {
        // Silencioso - manejo de errores sin spam
      }
      
      // ✅ CRITICAL: Force reset isSending state regardless of result
      // This ensures the button never gets stuck
      if (setIsSending) {
        setIsSending(false);
      }
      
      // ✅ Also reset status to unlock UI immediately
      if (setSendStatus) {
        setSendStatus({ success: null, message: '' });
      }
    } else {
      // 🚀 MODO SIMPLE (comportamiento original)
      const finalMessage = processTemplateVariables(message);
      const hasVariables = finalMessage !== message;

      let confirmMessage;
      if (selectedImage) {
        confirmMessage = `¿Estás seguro de enviar esta imagen a ${phoneCount} ${isMultiple ? 'contactos' : 'contacto'}?`;
      } else {
        confirmMessage = `¿Estás seguro de enviar este mensaje a ${phoneCount} ${isMultiple ? 'contactos' : 'contacto'}?`;
        if (hasVariables) {
          confirmMessage += `\n\n🔧 Mensaje final (con plantillas procesadas):\n"${finalMessage.substring(0, 200)}${finalMessage.length > 200 ? '...' : ''}"`;
        }
      }

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // ✅ Silencioso - sin notificación de inicio molesta

      try {
        let result;
        if (selectedImage) {
          result = await sendImage(numbers, selectedImage, finalMessage);
          // Limpiar después del envío
          if (result && (result.success || result.successCount > 0)) {
            setSelectedImage(null);
            setPreviewUrl('');
            setMessage('');
          }
      } else {
          result = await sendMessage(numbers, finalMessage);
          // Limpiar mensaje después del envío exitoso
          if (result && (result.success || result.successCount > 0)) {
            setMessage('');
      }
        }

        // ✅ Silencioso - sin notificación de variables molesta

        // Las notificaciones ya se manejan dentro de los hooks
    } catch (error) {
        // ✅ Silencioso - sin notificación de error molesta
      }
    }
  };

  /* ------------------------------------------------------------------
    MANEJO DE PLANTILLAS - YA IMPLEMENTADO ARRIBA
  ------------------------------------------------------------------*/

  /* ------------------------------------------------------------------
    MANEJO DE CONTACTOS
  ------------------------------------------------------------------*/
  const handleContactsSelect = (selectedPhones) => {
    setNumbers(selectedPhones);
    showSuccess(`Números de contactos cargados`, {
      title: 'Contactos Seleccionados'
    });
  };

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------*/
  return (
    <>
      {/* Sistema de notificaciones */}
      <NotificationSystem 
        notifications={notifications}
        onDismiss={removeNotification}
      />
      
      <div className="popup-container">
        {/* 🚫 RESTRICCIÓN: Solo funciona en WhatsApp Web */}
        {!isOnWhatsAppTab ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            margin: '20px',
            border: '2px solid #ffeaa7'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ color: '#856404', marginBottom: '12px' }}>
              Extensión Bloqueada
            </h3>
            <p style={{ color: '#856404', marginBottom: '16px', lineHeight: '1.5' }}>
              Esta extensión solo funciona cuando estás en <strong>WhatsApp Web</strong>.
            </p>
            <p style={{ fontSize: '14px', color: '#856404', marginBottom: '20px' }}>
              Por favor, abre una pestaña con <code>web.whatsapp.com</code> y vuelve a intentar.
            </p>
          <button
              onClick={() => window.open('https://web.whatsapp.com', '_blank')}
            style={{
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
              cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🚀 Abrir WhatsApp Web
          </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <Header
              onOpenTemplates={() => setShowTemplatesModal(true)}

              onOpenContacts={() => setShowContactManager(true)}
            />

      {/* Status Bar */}
              <StatusBar
          isLoading={isLoading}
          isWhatsAppReady={isWhatsAppReady}
          onRefresh={checkWhatsAppStatus}
        />
        
        {/* Indicador de reintentos automáticos */}
        {retryCount > 0 && (
          <div style={{
            padding: '8px 20px',
            background: '#fff3cd',
            color: '#856404',
            borderBottom: '1px solid #ffeaa7',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
            gap: '8px'
          }}>
            <span>🔄</span>
            Reintentando conexión automáticamente... (intento {retryCount}/3)
        </div>
        )}

      {/* Main Content - UNA SOLA COLUMNA */}
      <div className="main-content-single">
          {/* Campo de números */}
          <div className="form-group">
            <label>
              Números de teléfono 
              <small style={{ color: '#6c757d', fontWeight: 'normal' }}>
                (separados por comas o saltos de línea)
              </small>
            </label>
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={4}
              placeholder="Ej: +51987654321, +51987654322"
              style={{ 
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}
            />
            
            {/* Botón eliminado - ahora solo está en el Header */}
            
            {/* Estadísticas de números */}
            {numbers && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px'
                }}>
                  <span style={{ 
                    color: phoneStats.valid > 0 ? '#25D366' : '#dc3545'
                  }}>
                    {phoneStats.total} número(s) detectado(s)
                    </span>
                  
                  {phoneStats.valid > 0 && phoneStats.invalid > 0 && (
                    <span style={{ color: '#dc3545' }}>
                      ({phoneStats.invalid} inválidos)
                    </span>
                  )}
                  
                  {phoneStats.duplicates > 0 && (
                    <span style={{ color: '#ffc107' }}>
                      ({phoneStats.duplicates} duplicados)
                    </span>
                  )}
                  </div>
                
                {/* Mostrar países detectados */}
                {phoneStats.countries.length > 0 && (
                  <div style={{ marginTop: '5px', fontSize: '11px', color: '#6c757d' }}>
                    Países: {phoneStats.countries.map(c => `${c.flag} ${c.country} (${c.count})`).join(', ')}
                  </div>
                )}
                
                {phoneStats.invalid > 0 && (
                  <div style={{ 
                    marginTop: '5px', 
                    fontSize: '11px', 
                    color: '#dc3545',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const validation = validatePhoneNumbers(numbers);
                    const errorDetails = validation.errors.join('\n');
                    showError('Se encontraron números inválidos', {
                      title: 'Números con Errores',
                      details: errorDetails
                    });
                  }}>
                    ⚠️ Hacer clic para ver detalles de errores
                </div>
                )}
                </div>
              )}
            </div>

          {/* 🚀 TOGGLE DE MODO - JUSTO DESPUÉS DE NÚMEROS */}
          <div className="mode-toggle-container">
          <button
              onClick={() => setIsMultiSectionMode(false)}
              className={`mode-toggle-btn ${!isMultiSectionMode ? 'active' : ''}`}
            >
              Mensaje Simple
          </button>
          <button
              onClick={() => setIsMultiSectionMode(true)}
              className={`mode-toggle-btn ${isMultiSectionMode ? 'active' : ''}`}
            >
              Multi-Sección
        </button>
          </div>

          {/* 🚀 EDITOR SEGÚN EL MODO */}
          {!isMultiSectionMode ? (
            // MODO SIMPLE
            <>
          <div className="form-group">
                <label>
                  Mensaje
                  {selectedImage && (
                    <small style={{ color: '#6c757d', fontWeight: 'normal' }}>
                      (será usado como pie de foto)
                    </small>
                  )}
                </label>
              </div>
              
              <MessageEditor
                message={message}
                setMessage={setMessage}
                disabled={!!previewUrl}
                placeholder={
                  selectedImage 
                    ? "Escribe un pie de foto para tu imagen..."
                    : "Escribe tu mensaje aquí... Usa \"nombrePlantilla\" o (nombrePlantilla) para insertar plantillas"
                }
              />

              {/* Upload de imagen - Solo en modo simple */}
              <ImageUpload
                selectedImage={selectedImage}
                previewUrl={previewUrl}
                onImageSelect={handleImageSelect}
                onClearImage={clearImage}
                message={message}
                setMessage={setMessage}
              />
            </>
          ) : (
            // MODO MULTI-SECCIÓN
            <MultiMessageEditor
              sections={messageSections}
              setSections={setMessageSections}
              disabled={false}
            />
          )}

          {/* Botón de envío */}
          <SendButton
            onSend={handleSend}
            isSending={isSending}
            isLoading={isLoading}
            isWhatsAppReady={isWhatsAppReady}
            hasValidNumbers={hasValidNumbers(numbers)}
            numbers={numbers}
            selectedImage={selectedImage}
            message={isMultiSectionMode ? messageSections : message}
            isMultiSection={isMultiSectionMode}
          />

          {/* Estado del envío */}
          <SendStatus status={sendStatus} />

          {/* Herramientas de plantillas dinámicas - Solo en modo simple */}
          {!isMultiSectionMode && message && templates.length > 0 && (
            <div style={{
                marginTop: '10px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                  🔧 Variables de Plantillas
                </span>
            <button
                  onClick={handleApplyTemplateVariables}
              style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  ✨ Aplicar Variables
            </button>
              </div>
              
              {/* Sugerencias de plantillas disponibles */}
              <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                <strong>Plantillas disponibles:</strong> {templates.map(t => `"${t.name}"`).join(', ')}
              </div>
              
              {/* Vista previa si hay variables detectadas */}
              {(() => {
                const processed = processTemplateVariables(message);
                if (processed !== message) {
                  return (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '11px', 
                      color: '#28a745',
                      background: '#d4edda',
                      padding: '6px',
                      borderRadius: '4px'
                    }}>
                      <strong>Vista previa:</strong><br/>
                      {processed.substring(0, 200)}{processed.length > 200 ? '...' : ''}
            </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

            </div>
          </>
          )}
        </div>
          
      {/* SOLO renderizar un modal a la vez */}
      {showTemplatesModal && (
        <TemplatesSection
          isOpen={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          notifications={{ showSuccess, showError, showWarning, showInfo }}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {showContactManager && (
        <ContactManager
          isOpen={showContactManager}
          onClose={() => setShowContactManager(false)}
          onContactsSelect={handleContactsSelect}
          notifications={{ showSuccess, showError, showWarning, showInfo }}
        />
      )}


    </>
  );
}

export default Popup;