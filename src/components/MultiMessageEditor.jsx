import React, { useState, useEffect } from 'react';

const MultiMessageEditor = ({ 
  sections, 
  setSections, 
  disabled = false 
}) => {
  // Agregar una sección inicial si no hay ninguna
  useEffect(() => {
    if (sections.length === 0) {
      setSections([{
        id: Date.now(),
        text: '',
        image: null,
        imagePreview: null
      }]);
    }
  }, [sections.length, setSections]);

  const addSection = () => {
    // ✅ Límite máximo de 4 secciones
    if (sections.length >= 4) {
      return;
    }
    
    const newSection = {
      id: Date.now(),
      text: '',
      image: null,
      imagePreview: null
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id) => {
    if (sections.length > 1) {
      setSections(sections.filter(section => section.id !== id));
    }
  };

  const updateSectionText = (id, text) => {
    setSections(sections.map(section => {
      // ✅ No permitir actualizar texto si hay imagen
      if (section.id === id && section.image) {
        return section; // No cambiar nada si hay imagen
      }
      return section.id === id ? { ...section, text } : section;
    }));
  };

  const updateSectionImage = (id, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSections(sections.map(section => 
          section.id === id ? { 
            ...section, 
            image: file, 
            imagePreview: e.target.result,
            text: '' // ✅ Limpiar texto al agregar imagen
          } : section
        ));
      };
      reader.readAsDataURL(file);
    } else {
      setSections(sections.map(section => 
        section.id === id ? { 
          ...section, 
          image: null, 
          imagePreview: null 
        } : section
      ));
    }
  };

  const moveSection = (id, direction) => {
    const currentIndex = sections.findIndex(s => s.id === id);
    if (
      (direction === 'up' && currentIndex > 0) ||
      (direction === 'down' && currentIndex < sections.length - 1)
    ) {
      const newSections = [...sections];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Intercambiar posiciones
      [newSections[currentIndex], newSections[targetIndex]] = 
      [newSections[targetIndex], newSections[currentIndex]];
      
      setSections(newSections);
    }
  };

  // Ya no necesitamos ReactQuill - usaremos textarea simple

  // El modo multi-sección nunca se deshabilita - cada sección maneja sus propias imágenes

  return (
    <div className="multi-message-editor">
      <div className="multi-message-header">
        <h3>Mensajes Multi-Sección</h3>
        <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 15px 0' }}>
          Crea múltiples mensajes que se enviarán uno tras otro. 
          Ideal para: saludo → promoción → despedida
        </p>
      </div>

      {sections.map((section, index) => (
        <div key={section.id} className="message-section">
          <div className="section-header">
            <div className="section-number">
              Mensaje {index + 1}
            </div>
            <div className="section-controls">
              {/* Botones de orden */}
              <button
                type="button"
                onClick={() => moveSection(section.id, 'up')}
                disabled={index === 0}
                className="section-control-btn"
                title="Subir"
              >
                ⬆️
              </button>
              <button
                type="button"
                onClick={() => moveSection(section.id, 'down')}
                disabled={index === sections.length - 1}
                className="section-control-btn"
                title="Bajar"
              >
                ⬇️
              </button>
              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                disabled={sections.length <= 1}
                className="section-control-btn remove-btn"
                title="Eliminar sección"
              >
                🗑️
              </button>
            </div>
          </div>

          <div className="section-content">
            {/* Editor de texto */}
            <div className="section-text">
              <textarea
                value={section.text}
                onChange={(e) => updateSectionText(section.id, e.target.value)}
                disabled={!!section.image} // ✅ Deshabilitar cuando hay imagen
                placeholder={section.image ? 
                  `Imagen seleccionada - No se puede agregar texto` : 
                  `Escribe el mensaje ${index + 1}...`
                }
                rows={section.image ? 4 : 6}
                className="section-textarea"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: section.image ? '2px solid #ccc' : '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: section.image ? '120px' : '150px',
                  lineHeight: '1.5',
                  backgroundColor: section.image ? '#f5f5f5' : 'white',
                  color: section.image ? '#999' : 'inherit',
                  cursor: section.image ? 'not-allowed' : 'text'
                }}
              />
            </div>

            {/* Imagen opcional */}
            <div className="section-image">
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>
                {section.image ? 'Imagen con comentario:' : 'Imagen opcional para este mensaje:'}
              </label>
              
              {section.imagePreview ? (
                <div className="image-preview-small">
                  <img 
                    src={section.imagePreview} 
                    alt="Vista previa" 
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      objectFit: 'cover', 
                      borderRadius: '8px',
                      border: '2px solid #e9ecef'
                    }} 
                  />
                  <div className="image-actions-small">
                    <button
                      type="button"
                      onClick={() => updateSectionImage(section.id, null)}
                      className="remove-image-btn-small"
                      title="Quitar imagen"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ) : (
                <div className="image-upload-small">
                  <input
                    type="file"
                    id={`image-${section.id}`}
                    accept="image/*"
                    onChange={(e) => updateSectionImage(section.id, e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`image-${section.id}`).click()}
                    className="upload-btn-small"
                  >
                    Agregar imagen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="add-section-container">
        <button
          type="button"
          onClick={addSection}
          className="add-section-btn"
          disabled={sections.length >= 4}
          style={{
            opacity: sections.length >= 4 ? 0.5 : 1,
            cursor: sections.length >= 4 ? 'not-allowed' : 'pointer'
          }}
        >
          {sections.length >= 4 ? 'Máximo 4 secciones' : 'Agregar nueva sección'}
        </button>
        
        <div className="sections-summary">
          <small style={{ color: '#666' }}>
            Total: {sections.length}/4 mensaje{sections.length !== 1 ? 's' : ''} 
            • Con imagen: {sections.filter(s => s.image).length}
          </small>
          {sections.length >= 4 && (
            <small style={{ color: '#ff9800', display: 'block', marginTop: '4px' }}>
              ⚠️ Límite máximo alcanzado (4 secciones)
            </small>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiMessageEditor;