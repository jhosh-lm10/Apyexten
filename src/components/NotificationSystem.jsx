import React, { useState, useEffect } from 'react';

const NotificationSystem = ({ notifications, onDismiss }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

const Notification = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-dismiss para notificaciones de éxito e info
    if (notification.type !== 'error' && notification.autoDismiss !== false) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  const getStyles = () => {
    const baseStyles = {
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      border: '1px solid',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      background: 'white',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      minWidth: '300px'
    };

    switch (notification.type) {
      case 'success':
        return {
          ...baseStyles,
          borderColor: '#d4edda',
          background: '#d4edda',
          color: '#155724'
        };
      case 'error':
        return {
          ...baseStyles,
          borderColor: '#f8d7da',
          background: '#f8d7da',
          color: '#721c24'
        };
      case 'warning':
        return {
          ...baseStyles,
          borderColor: '#fff3cd',
          background: '#fff3cd',
          color: '#856404'
        };
      case 'info':
        return {
          ...baseStyles,
          borderColor: '#d1ecf1',
          background: '#d1ecf1',
          color: '#0c5460'
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div style={getStyles()} onClick={handleDismiss}>
      <span style={{ fontSize: '20px', flexShrink: 0 }}>
        {getIcon()}
      </span>
      <div style={{ flex: 1 }}>
        {notification.title && (
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '4px',
            fontSize: '14px'
          }}>
            {notification.title}
          </div>
        )}
        <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
          {notification.message}
        </div>
        {notification.details && (
          <details style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
            <summary style={{ cursor: 'pointer' }}>Ver detalles</summary>
            <pre style={{ 
              marginTop: '8px', 
              padding: '8px', 
              background: 'rgba(0,0,0,0.1)', 
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '100px'
            }}>
              {notification.details}
            </pre>
          </details>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          opacity: 0.6,
          padding: '0',
          flexShrink: 0
        }}
        title="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
};

export default NotificationSystem;