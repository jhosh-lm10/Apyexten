import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import './popup.css';

// Utilidad para formatear fechas
const formatDateTime = (date) => {
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Utilidad para calcular el tiempo restante
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

// Componente Modal para crear/editar plantillas
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{ marginTop: 0, color: '#b30000' }}>
          {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
        </h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
              boxSizing: 'border-box'
            }}
            placeholder="Ej: Recordatorio de pago"
          />
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '15px' }}>
          <label style={{ marginBottom: '5px', fontWeight: 'bold' }}>Contenido:</label>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  ['link', 'image'],
                  ['clean']
                ]
              }}
              formats={[
                'header',
                'bold', 'italic', 'underline', 'strike',
                'list', 'bullet',
                'link', 'image'
              ]}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ id: template?.id, name, content })}
            disabled={!name.trim() || !content.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: !name.trim() || !content.trim() ? '#ccc' : '#b30000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !name.trim() || !content.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {template ? 'Actualizar' : 'Guardar'} Plantilla
          </button>
        </div>
      </div>
    </div>
  );
};

// Estilos personalizados para el editor
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
  .ql-toolbar button:hover, .ql-toolbar button.ql-active {
    color: #b30000 !important;
  }
  .ql-toolbar button.ql-active .ql-stroke {
    stroke: #b30000 !important;
  }
  .ql-toolbar button.ql-active .ql-fill {
    fill: #b30000 !important;
  }
`;
