import React from 'react';

const SendButton = ({ 
  onSend, 
  isSending, 
  isLoading, 
  isWhatsAppReady, 
  hasValidNumbers, 
  numbers, 
  selectedImage, 
  message,
  isMultiSection = false
}) => {
  const parseNumbers = (text) => text.split(/[\n,\s]+/).filter(Boolean);
  
  const isDisabled = () => {
    if (isSending || isLoading || !isWhatsAppReady || !hasValidNumbers) {
      return true;
    }
    
    if (isMultiSection) {
      // Para modo multi-sección, validar que hay secciones con contenido
      const sections = Array.isArray(message) ? message : [];
      
      const validSections = sections.filter(section => {
        // Validación simple con textarea - sin HTML
        const hasText = section.text && section.text.trim() !== '';
        const hasImage = section.image;
        
        return hasText || hasImage;
      });
      return validSections.length === 0;
    } else {
      // Para modo simple, validar mensaje o imagen
      return !selectedImage && (!message || !message.trim());
    }
  };

  const getButtonText = () => {
    if (isSending) return 'Enviando...';
    
    const count = parseNumbers(numbers).length;
    const isMultiple = count > 1;
    
    if (isMultiSection) {
      const sections = Array.isArray(message) ? message : [];
      const validSections = sections.filter(section => 
        section.text?.trim() !== '' || section.image
      );
      const totalMessages = validSections.length * count;
      return `🚀 Enviar ${validSections.length} Mensajes × ${count} (${totalMessages} totales)`;
    }
    
    if (selectedImage) {
      return `Enviar Imagen${isMultiple ? 's' : ''} (${count})`;
    }
    
    return `Enviar Mensaje${isMultiple ? 's' : ''} (${count})`;
  };

  const getButtonClass = () => {
    let classes = 'send-button';
    if (selectedImage) classes += ' image-mode';
    if (isMultiSection) classes += ' multi-section-mode';
    return classes;
  };

  return (
    <button
      onClick={onSend}
      disabled={isDisabled()}
      className={getButtonClass()}
    >
      {isSending && <span className="loading-spinner"></span>}
      {getButtonText()}
    </button>
  );
};

export default SendButton;