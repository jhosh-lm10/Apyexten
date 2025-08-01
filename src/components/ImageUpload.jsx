import React from 'react';

const ImageUpload = ({ 
  selectedImage, 
  previewUrl, 
  onImageSelect, 
  onClearImage,
  message,
  setMessage 
}) => {
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageSelect(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
          <div className="form-group" style={{ marginTop: '10px', padding: '0 15px 15px' }}>
            <label>Pie de foto (opcional):</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe un mensaje para acompañar la imagen"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
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
            <span>📸</span>
            <p>Haz clic para seleccionar una imagen</p>
            <small style={{ color: '#999', fontSize: '12px' }}>
              Formatos soportados: JPG, PNG, GIF (máx. 16MB)
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;