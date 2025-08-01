import React from 'react';

const MessageEditor = ({ 
  message, 
  setMessage, 
  disabled = false,
  placeholder = "Escribe tu mensaje aquí..." 
}) => {
  if (disabled) {
    return (
      <div className="simple-editor-disabled">
        <p>Editor deshabilitado</p>
        <p>El editor se desactiva cuando tienes una imagen seleccionada.</p>
        <p>Puedes agregar un pie de foto en el campo superior.</p>
      </div>
    );
  }

  return (
    <div className="message-editor">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="simple-text-editor"
        style={{
          width: '100%',
          padding: '12px',
          border: '2px solid #e9ecef',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: '200px',
          lineHeight: '1.5'
        }}
      />
    </div>
  );
};

export default MessageEditor;