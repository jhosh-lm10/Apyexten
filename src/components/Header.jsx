import React from 'react';

const Header = ({ 
  onOpenTemplates,
  onOpenContacts
}) => {
  return (
    <div className="header">
      <h2>🚀 APYSKY</h2>
      <div className="header-actions">

        <button
          onClick={() => onOpenTemplates && onOpenTemplates()}
          className="header-button templates-button"
          style={{
            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
            color: 'white',
            border: 'none',
            fontWeight: '600'
          }}
        >
          <span>📋</span>
          Ver Plantillas
        </button>
        <button
          onClick={() => onOpenContacts && onOpenContacts()}
          className="header-button contacts-button"
          style={{
            background: 'linear-gradient(135deg, #6f42c1 0%, #5a2d8a 100%)',
            color: 'white',
            border: 'none',
            fontWeight: '600'
          }}
        >
          <span>👥</span>
          Gestionar Contactos
        </button>
      </div>
    </div>
  );
};

export default Header;