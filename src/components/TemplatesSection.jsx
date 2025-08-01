import React, { useState, useEffect } from 'react';
import TemplateModal from './TemplateModal';

const TemplatesSection = ({ 
  isOpen, 
  onClose, 
  notifications,
  onUseTemplate 
}) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // list, create

  // Cargar plantillas al abrir
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const result = await chrome.storage.local.get(['templates']);
      const savedTemplates = result.templates || [];
      setTemplates(savedTemplates);
      console.log('📋 Plantillas cargadas:', savedTemplates);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      notifications?.showError('Error al cargar plantillas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      const newTemplate = {
        id: templateData.id || Date.now().toString(),
        name: templateData.name,
        content: templateData.content,
        variables: templateData.variables || {},
        processedContent: templateData.processedContent,
        createdAt: new Date().toISOString()
      };

      let updatedTemplates;
      if (templateData.id) {
        // Editar plantilla existente
        updatedTemplates = templates.map(t => 
          t.id === templateData.id ? newTemplate : t
        );
      } else {
        // Nueva plantilla  
        updatedTemplates = [...templates, newTemplate];
      }

      setTemplates(updatedTemplates);
      await chrome.storage.local.set({ templates: updatedTemplates });
      
      setShowTemplateModal(false);
      setEditingTemplate(null);
      
      notifications?.showSuccess('Plantilla guardada correctamente');
      console.log('✅ Plantilla guardada:', newTemplate);
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      notifications?.showError('Error al guardar la plantilla');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
      return;
    }

    try {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      await chrome.storage.local.set({ templates: updatedTemplates });
      notifications?.showInfo('Plantilla eliminada');
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      notifications?.showError('Error al eliminar la plantilla');
    }
  };

  const handleUseTemplate = (template) => {
    // Si la plantilla tiene variables, usar el contenido procesado
    const content = template.processedContent || template.content;
    onUseTemplate(content);
    notifications?.showSuccess(`Plantilla "${template.name}" aplicada al mensaje`);
    onClose(); // Cerrar el modal después de usar la plantilla
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '800px', 
          height: '600px',
          position: 'relative',
          background: 'white',
          overflow: 'hidden',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
      >
        <div className="modal-header">
          <button 
            className="back-button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              marginRight: '10px'
            }}
          >
            ← Volver
          </button>
          <h3>📋 Gestión de Plantillas</h3>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e9ecef',
            marginBottom: '20px'
          }}>
            {[
              { id: 'list', label: '📋 Mis Plantillas', count: templates.length },
              { id: 'create', label: '➕ Nueva Plantilla' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === tab.id ? '#25D366' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#666',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                  marginRight: '5px',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  fontSize: '14px'
                }}
              >
                {tab.label} {tab.count !== undefined && `(${tab.count})`}
              </button>
            ))}
          </div>

          {/* Contenido de tabs */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'list' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '15px' 
                }}>
                  <h4 style={{ margin: 0, color: '#495057' }}>
                    📋 Mis Plantillas ({templates.length})
                  </h4>
                  <button
                    onClick={() => loadTemplates()}
                    disabled={isLoading}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {isLoading ? '🔄 Cargando...' : '🔄 Actualizar'}
                  </button>
                </div>

                {isLoading ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#6c757d' 
                  }}>
                    🔄 Cargando plantillas...
                  </div>
                ) : templates.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#6c757d',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px dashed #dee2e6'
                  }}>
                    <h5 style={{ marginBottom: '10px' }}>No hay plantillas guardadas</h5>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      Crea tu primera plantilla para reutilizar mensajes frecuentes.
                    </p>
                    <button
                      onClick={() => setActiveTab('create')}
                      style={{
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginTop: '10px'
                      }}
                    >
                      ➕ Crear Primera Plantilla
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        style={{
                          padding: '15px',
                          background: 'white',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, marginRight: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                              <strong style={{ color: '#25D366', fontSize: '16px' }}>
                                {template.name}
                              </strong>
                              <span style={{ 
                                background: '#e9ecef',
                                color: '#6c757d',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                marginLeft: '8px'
                              }}>
                                {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Sin fecha'}
                              </span>
                            </div>
                            
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6c757d',
                              marginBottom: '8px',
                              lineHeight: '1.4',
                              background: '#f8f9fa',
                              padding: '8px',
                              borderRadius: '4px'
                            }}>
                              {(template.processedContent || template.content).substring(0, 150)}
                              {(template.processedContent || template.content).length > 150 ? '...' : ''}
                            </div>
                            
                            {template.variables && Object.keys(template.variables).length > 0 && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#007bff',
                                fontStyle: 'italic',
                                marginBottom: '8px'
                              }}>
                                📝 Variables: {Object.keys(template.variables).map(key => `{${key}}`).join(', ')}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '80px' }}>
                            <button
                              onClick={() => handleUseTemplate(template)}
                              style={{
                                background: '#25D366',
                                color: 'white',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                              title="Usar plantilla"
                            >
                              ✓ Usar
                            </button>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              style={{
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                              title="Editar plantilla"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                              title="Eliminar plantilla"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'create' && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%'
              }}>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  style={{
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    padding: '20px 40px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  ➕ Crear Nueva Plantilla
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edición/creación de plantillas */}
      {showTemplateModal && (
        <TemplateModal
          isOpen={showTemplateModal}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
          template={editingTemplate}
        />
      )}
    </div>
  );
};

export default TemplatesSection;