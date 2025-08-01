import React from 'react';

const StatusBar = ({ 
  isLoading, 
  isWhatsAppReady, 
  onRefresh 
}) => {
  const getStatusText = () => {
    if (isLoading) return 'Verificando conexión...';
    if (isWhatsAppReady) return 'Conectado a WhatsApp';
    return 'No se pudo conectar a WhatsApp';
  };

  const getStatusClass = () => {
    if (isLoading) return 'loading';
    if (isWhatsAppReady) return 'connected';
    return 'disconnected';
  };

  return (
    <div className="status-bar">
      <span className={`status-dot ${getStatusClass()}`}></span>
      <span>{getStatusText()}</span>
      <button 
        onClick={onRefresh} 
        disabled={isLoading} 
        className="refresh-btn"
        title="Actualizar estado"
      >
        ↻
      </button>
    </div>
  );
};

export default StatusBar;