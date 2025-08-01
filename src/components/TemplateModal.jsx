import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';

const TemplateModal = ({ isOpen, onClose, onSave, template = null }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState({});
  const [showVariables, setShowVariables] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setContent(template.content || '');
      setVariables(template.variables || {});
    } else {
      setName('');
      setContent('');
      setVariables({});
    }
  }, [template, isOpen]);

  // Detectar variables en el contenido
  const detectVariables = (text) => {
    const variableRegex = /\{([^}]+)\}/g;
    const matches = text.match(variableRegex);
    if (matches) {
      const newVariables = {};
      matches.forEach(match => {
        const varName = match.slice(1, -1); // Remover { }
        if (!variables[varName]) {
          newVariables[varName] = '';
        }
      });
      if (Object.keys(newVariables).length > 0) {
        setVariables(prev => ({ ...prev, ...newVariables }));
      }
    }
  };

  const handleContentChange = (value) => {
    setContent(value);
    detectVariables(value);
  };

  const addVariable = () => {
    const varName = prompt('Nombre de la variable (sin { }):');
    if (varName && !variables[varName]) {
      setVariables(prev => ({ ...prev, [varName]: '' }));
      setContent(prev => prev + `{${varName}}`);
    }
  };

  const updateVariable = (varName, value) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  };

  if (!isOpen) return null;

  const processTemplate = (templateContent, templateVariables) => {
    let processed = templateContent;
    Object.entries(templateVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, value);
    });
    return processed;
  };

  const handleSave = () => {
    if (name.trim() && content.trim()) {
      onSave({ 
        id: template?.id, 
        name: name.trim(), 
        content: content.trim(),
        variables: variables,
        processedContent: processTemplate(content.trim(), variables)
      });
    }
  };

  const isFormValid = name.trim() && content.trim();

  return (
    <div 
      className="template-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 15000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div 
        className="template-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '700px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 15001,
          border: '1px solid #e0e0e0'
        }}
      >
        <div className="template-modal-header" style={{
          padding: '20px',
          borderBottom: '1px solid #e9ecef',
          background: '#ffffff',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center'
        }}>
          <button 
            className="template-back-button"
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
          <h3 style={{ margin: 0, color: '#333' }}>
            {template ? '✏️ Editar Plantilla' : '➕ Nueva Plantilla'}
          </h3>
        </div>

        <div className="template-modal-body" style={{
          padding: '20px',
          background: '#ffffff',
          position: 'relative',
          zIndex: 1,
          overflow: 'auto',
          flex: 1
        }}>
          {/* Nombre */}
          <div className="form-group">
            <label>Nombre de la plantilla:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Recordatorio de pago"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Contenido */}
          <div className="form-group">
            <label>Contenido:</label>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              style={{ 
                height: '300px',
                marginBottom: '50px' // Espacio para la toolbar
              }}
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['link'],
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
              ]}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="btn-primary"
          >
            {template ? 'Actualizar' : 'Guardar'} Plantilla
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;