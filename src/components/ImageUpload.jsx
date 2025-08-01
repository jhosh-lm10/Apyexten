import React from 'react';

/**
 * ImageUpload (sin caption)
 *  - Solo permite seleccionar, previsualizar y eliminar la imagen.
 *  - NO renderiza cuadro de texto para pie de foto ni acepta props relacionados.
 */
const ImageUpload = ({
  selectedImage,
  previewUrl,
  onImageSelect,
  onClearImage
}) => {
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onImageSelect(file);
    // Permitir volver a elegir el mismo archivo
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const units = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
  };

  return (
    <div className="image-upload-section">
      <label>Imagen a enviar (opcional):</label>

      {previewUrl ? (
        <div className="image-preview fade-in">
          <img src={previewUrl} alt="Vista previa" className="preview-image" />

          <div className="image-actions">
            <button
              type="button"
              onClick={onClearImage}
              className="remove-image-btn"
              title="Quitar imagen"
            >
              ×
            </button>
            <span className="image-info">
              {selectedImage?.name} ({selectedImage ? formatFileSize(selectedImage.size) : ''})
            </span>
          </div>
        </div>
      ) : (
        <div
          className="upload-area"
          onClick={() => document.getElementById('image-upload').click()}
        >
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div className="upload-placeholder">
            <span role="img" aria-label="camera">📸</span>
            <p>Haz clic para seleccionar una imagen</p>
            <small style={{ color: '#999', fontSize: '12px' }}>
              Formatos soportados: JPG, PNG, GIF (máx. 16 MB)
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
