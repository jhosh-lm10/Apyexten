  // Manejar envío de mensajes
  const handleSend = async () => {
    const nums = numbers.split('\n').map(n => n.trim()).filter(Boolean);
    if (!nums.length || !message) return alert("Faltan datos");

    try {
      // Enviar mensaje a través de content script
      const [tab] = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      if (tab) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (nums, msg) => {
            window.postMessage({ 
              type: 'APYSKY_SEND', 
              numeros: nums, 
              mensaje: msg 
            }, '*');
          },
          args: [nums, message]
        });
        
        // Limpiar después de enviar
        setNumbers('');
        setMessage('');
        
        // Mostrar notificación
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Mensaje Enviado',
            message: `Mensaje enviado a ${nums.length} contacto${nums.length > 1 ? 's' : ''}`
          });
        }
      } else {
        alert('Por favor, abre WhatsApp Web para poder enviar mensajes');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      alert('Error al enviar el mensaje. Asegúrate de estar en WhatsApp Web.');
    }
  };

  // Exportar plantillas
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

  // Importar plantillas
  const importTemplates = () => {
    try {
      const importedTemplates = JSON.parse(importData);
      if (!Array.isArray(importedTemplates)) {
        throw new Error('El archivo no contiene un array de plantillas válido');
      }
      
      // Validar cada plantilla
      const validTemplates = importedTemplates.filter(t => 
        t && typeof t === 'object' && 
        'name' in t && 
        'content' in t
      );
      
      if (validTemplates.length === 0) {
        throw new Error('No se encontraron plantillas válidas en el archivo');
      }
      
      // Combinar con las existentes, evitando duplicados
      const existingIds = new Set(templates.map(t => t.id));
      const newTemplates = [
        ...templates,
        ...validTemplates.filter(t => !existingIds.has(t.id))
      ];
      
      setTemplates(newTemplates);
      setStorageData({ templates: newTemplates });
      setImportData('');
      setImportExportOpen(false);
      
      alert(`Se importaron ${validTemplates.length} plantillas correctamente`);
    } catch (error) {
      console.error('Error al importar plantillas:', error);
      alert(`Error al importar plantillas: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '15px', width: '400px', fontFamily: 'Arial', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <style>{customStyles}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ color: '#b30000', margin: 0 }}>Apysky</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowScheduled(!showScheduled)}
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
              gap: '5px'
            }}
          >
            <span>⏰</span>
            {showScheduled ? 'Ocultar' : 'Ver'} Programados
          </button>
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
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
              gap: '5px'
            }}
          >
            <span>📋</span>
            {showTemplates ? 'Ocultar' : 'Ver'} Plantillas
          </button>
        </div>
      </div>
      
      {showScheduled ? (
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
                gap: '5px'
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
              {scheduledMessages.map(msg => (
                <div 
                  key={msg.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '10px',
                    backgroundColor: '#f9f9f9'
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
                      <span style={{
                        background: '#e6f7ff',
                        color: '#1890ff',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
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
                          alignItems: 'center'
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
                      WebkitBoxOrient: 'vertical'
                    }}
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{msg.numbers.length} contacto{msg.numbers.length > 1 ? 's' : ''}</span>
                    <span>Creado: {new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : showTemplates ? (
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
                  gap: '4px'
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
                  gap: '4px'
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
              gap: '5px'
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
              {templates.map(template => (
                <div 
                  key={template.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '10px',
                    backgroundColor: '#f9f9f9',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                  onClick={() => applyTemplate(template)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong style={{ color: '#b30000' }}>{template.name}</strong>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(template);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          marginRight: '5px'
                        }}
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
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#1890ff',
                          cursor: 'pointer',
                          marginRight: '5px'
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
                            await deleteTemplate(template.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff4d4f',
                          cursor: 'pointer'
                        }}
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
                      WebkitBoxOrient: 'vertical'
                    }}
                    dangerouslySetInnerHTML={{ __html: template.content }}
                  />
                  {template.createdAt && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#888', 
                      marginTop: '8px',
                      textAlign: 'right'
                    }}>
                      Creada: {new Date(template.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ color: '#333', fontWeight: 'bold' }}>Mensaje:</label>
            <div>
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
                  gap: '4px'
                }}
              >
                <span>📋</span> Plantillas
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '15px' }}>
            <ReactQuill
              theme="snow"
              value={message}
              onChange={setMessage}
              modules={modules}
              formats={formats}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            />
          </div>
          
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
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
              Programar envío (opcional):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DatePicker
                selected={scheduleDate}
                onChange={(date) => setScheduleDate(date)}
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
                      cursor: 'pointer'
                    }}
                    readOnly
                  />
                }
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSend}
              disabled={!message.trim() || !numbers.trim()}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: !message.trim() || !numbers.trim() ? '#ccc' : '#b30000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !message.trim() || !numbers.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>✉️</span> Enviar Ahora
            </button>
            
            <button
              onClick={scheduleMessage}
              disabled={!message.trim() || !numbers.trim()}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: !message.trim() || !numbers.trim() ? '#f0f0f0' : '#f9f0ff',
                color: !message.trim() || !numbers.trim() ? '#999' : '#722ed1',
                border: `1px solid ${!message.trim() || !numbers.trim() ? '#d9d9d9' : '#d3adf7'}`,
                borderRadius: '4px',
                cursor: !message.trim() || !numbers.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>⏰</span> Programar
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de vista previa */}
      {previewTemplate && (
        <div style={{
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
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
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
                color: '#666'
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
                minHeight: '100px'
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
                  cursor: 'pointer'
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
                  cursor: 'pointer'
                }}
              >
                Usar esta plantilla
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de importar/exportar */}
      {importExportOpen && (
        <div style={{
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
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            <h3 style={{ color: '#b30000', marginTop: 0 }}>Importar/Exportar Plantillas</h3>
            
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
                  gap: '8px'
                }}
              >
                <span>⬇️</span> Exportar ({templates.length} plantillas)
              </button>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '10px' }}>Importar Plantillas</h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Importa plantillas desde un archivo JSON. Las plantillas con IDs existentes no se sobreescribirán.
              </p>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder='Pega aquí el contenido del archivo JSON de plantillas...'
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  resize: 'vertical'
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
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setImportData(event.target.result);
                        };
                        reader.readAsText(file);
                      }
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
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
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de plantilla */}
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
