import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const TemplateModal = ({ isOpen, onClose, onSave, template }) => {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
    }
  }, [template]);

  return (
    isOpen && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ marginBottom: '20px' }}>
            {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Nombre
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
                fontSize: '14px',
              }}
              placeholder="Nombre de la plantilla"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Contenido
            </label>
            <ReactQuill
              value={content}
              onChange={setContent}
              theme="snow"
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline', 'strike'],
                  ['link', 'image'],
                ],
              }}
              style={{
                height: '200px',
                marginBottom: '10px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '1px solid #ccc',
                '&:hover': {
                  backgroundColor: '#e0e0e0',
                },
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
    )
  );
};

export default TemplateModal;
