import React, { useState, useEffect } from 'react';

const ContactManager = ({ 
  onContactsSelect, 
  notifications,
  isOpen,
  onClose 
}) => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('contacts'); // contacts, groups, import
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [importData, setImportData] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [importPreview, setImportPreview] = useState(null);

  // Cargar datos al montar
  useEffect(() => {
    loadContactsFromStorage();
    loadGroupsFromStorage();
  }, []);

  const loadContactsFromStorage = async () => {
    try {
      const stored = localStorage.getItem('apysky_contacts');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadGroupsFromStorage = async () => {
    try {
      const stored = localStorage.getItem('apysky_groups');
      if (stored) {
        setGroups(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const saveContactsToStorage = (contactList) => {
    try {
      localStorage.setItem('apysky_contacts', JSON.stringify(contactList));
      setContacts(contactList);
    } catch (error) {
      console.error('Error saving contacts:', error);
      notifications?.showError('Error al guardar contactos');
    }
  };

  const saveGroupsToStorage = (groupList) => {
    try {
      localStorage.setItem('apysky_groups', JSON.stringify(groupList));
      setGroups(groupList);
    } catch (error) {
      console.error('Error saving groups:', error);
      notifications?.showError('Error al guardar grupos');
    }
  };

  // Validar número de teléfono
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = cleaned.length >= 6 && cleaned.length <= 15;
    console.log(`🔍 APYSKY: Validando teléfono "${phone}" -> limpio: "${cleaned}" -> válido: ${isValid}`);
    return isValid;
  };

  // Agregar contacto individual
  const addContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      notifications?.showError('Nombre y teléfono son requeridos');
      return;
    }

    const cleanPhone = newContactPhone.replace(/\D/g, '');
    
    if (!validatePhoneNumber(cleanPhone)) {
      notifications?.showError('Número de teléfono inválido (6-15 dígitos)');
      return;
    }

    // Verificar duplicados
    const exists = contacts.some(c => c.phone === cleanPhone);
    if (exists) {
      notifications?.showWarning('Este número ya existe en tus contactos');
      return;
    }

    const newContact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      phone: cleanPhone,
      addedAt: new Date().toISOString(),
      messagesSent: 0,
      lastMessageAt: null
    };

    const updatedContacts = [...contacts, newContact];
    saveContactsToStorage(updatedContacts);
    
    setNewContactName('');
    setNewContactPhone('');
    notifications?.showSuccess(`Contacto ${newContact.name} agregado`);
  };

  // Eliminar contacto
  const deleteContact = (contactId) => {
    if (!window.confirm('¿Estás seguro de eliminar este contacto?')) return;
    
    const updatedContacts = contacts.filter(c => c.id !== contactId);
    saveContactsToStorage(updatedContacts);
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      newSet.delete(contactId);
      return newSet;
    });
    notifications?.showInfo('Contacto eliminado');
  };

  // Procesar archivo subido
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    notifications?.showInfo('Procesando archivo...', { title: 'Importando' });

    try {
      let content = '';

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        // Leer archivo CSV/TXT
        content = await file.text();
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Para Excel, simularemos la lectura (en una implementación real usarías una librería como xlsx)
        notifications?.showWarning('Para archivos Excel, copia y pega el contenido por ahora', {
          title: 'Excel no soportado aún',
          details: '1. Abre tu archivo Excel\n2. Selecciona las columnas con nombres y teléfonos\n3. Copia (Ctrl+C)\n4. Pégalo en el área de texto'
        });
        return;
      } else {
        notifications?.showError('Formato de archivo no soportado');
        return;
      }

      setImportData(content);
      console.log('🔍 APYSKY: Contenido CSV cargado:', content);
      notifications?.showSuccess(`Archivo ${file.name} cargado correctamente`, {
        title: 'Archivo cargado',
        details: 'Ahora haz clic en "Importar Contactos" para procesarlos'
      });
    } catch (error) {
      notifications?.showError(`Error al leer el archivo: ${error.message}`);
    }

    // Limpiar el input para permitir subir el mismo archivo de nuevo
    event.target.value = '';
  };

  // Parsear datos de importación con múltiples separadores
  const parseImportData = (data) => {
    if (!data.trim()) return [];

    const lines = data.trim().split('\n').filter(line => line.trim());
    const results = [];

    lines.forEach((line, index) => {
      // Intentar diferentes separadores: coma, tab, punto y coma, espacios múltiples
      let parts = [];
      
      if (line.includes('\t')) {
        // Separado por tabulaciones (desde Excel)
        parts = line.split('\t').map(p => p.trim()).filter(p => p);
      } else if (line.includes(',')) {
        // Separado por comas (CSV)
        parts = line.split(',').map(p => p.trim()).filter(p => p);
      } else if (line.includes(';')) {
        // Separado por punto y coma
        parts = line.split(';').map(p => p.trim()).filter(p => p);
      } else {
        // Separado por espacios múltiples
        parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
        if (parts.length < 2) {
          // Intentar separar por un solo espacio si hay exactamente 2 partes
          const spaceParts = line.trim().split(' ');
          if (spaceParts.length >= 2) {
            const phone = spaceParts[spaceParts.length - 1];
            const name = spaceParts.slice(0, -1).join(' ');
            parts = [name, phone];
          }
        }
      }

      if (parts.length < 2) {
        results.push({
          index: index + 1,
          original: line,
          error: 'Formato incorrecto - necesita nombre y teléfono'
        });
        return;
      }

      // Detectar cuál es el nombre y cuál el teléfono
      let name, phone;
      const firstPart = parts[0];
      const lastPart = parts[parts.length - 1];

      // Si el último elemento parece un teléfono, usarlo como teléfono
      if (/[\d+\-\(\)\s]{6,}/.test(lastPart)) {
        phone = lastPart;
        name = parts.slice(0, -1).join(' ');
      } else if (/[\d+\-\(\)\s]{6,}/.test(firstPart)) {
        // Si el primer elemento parece un teléfono
        phone = firstPart;
        name = parts.slice(1).join(' ');
      } else {
        // Asumir que el segundo elemento es el teléfono
        name = firstPart;
        phone = parts[1];
      }

      const cleanPhone = phone.replace(/\D/g, '');

      results.push({
        index: index + 1,
        original: line,
        name: name.trim(),
        phone: phone.trim(),
        cleanPhone,
        isValid: validatePhoneNumber(cleanPhone)
      });
    });

    return results;
  };

  // Importar contactos desde CSV o texto
  const importContacts = () => {
    console.log('🚀 APYSKY: Iniciando importContacts...');
    console.log('🔍 APYSKY: importData length:', importData.length);
    console.log('🔍 APYSKY: importData:', importData);
    
    if (!importData.trim()) {
      notifications?.showError('Pega los datos de contactos para importar');
      return;
    }

    console.log('🔧 APYSKY: Parseando datos...');
    const parsedData = parseImportData(importData);
    console.log('📋 APYSKY: Datos parseados:', parsedData);
    
    const newContacts = [];
    const errors = [];

    parsedData.forEach((item, idx) => {
      console.log(`🔍 APYSKY: Procesando item ${idx}:`, item);
      
      if (item.error) {
        console.log(`❌ APYSKY: Error en item ${idx}:`, item.error);
        errors.push(`Línea ${item.index}: ${item.error}`);
        return;
      }

      if (!item.isValid) {
        console.log(`❌ APYSKY: Número inválido en item ${idx}:`, item.phone);
        errors.push(`Línea ${item.index}: Número inválido (${item.phone})`);
        return;
      }

      // Verificar duplicados
      const exists = contacts.some(c => c.phone === item.cleanPhone) || 
                     newContacts.some(c => c.phone === item.cleanPhone);
      if (exists) {
        errors.push(`Línea ${item.index}: Número duplicado (${item.phone})`);
        return;
      }

      newContacts.push({
        id: (Date.now() + item.index).toString(),
        name: item.name,
        phone: item.cleanPhone,
        addedAt: new Date().toISOString(),
        messagesSent: 0,
        lastMessageAt: null
      });
    });

    if (newContacts.length === 0) {
      notifications?.showError('No se pudieron importar contactos', {
        details: errors.join('\n')
      });
      return;
    }

    const updatedContacts = [...contacts, ...newContacts];
    saveContactsToStorage(updatedContacts);
    setImportData('');
    
    console.log('✅ APYSKY: Contactos importados:', newContacts);

    if (errors.length > 0) {
      notifications?.showWarning(`${newContacts.length} contactos importados, ${errors.length} errores`, {
        title: 'Importación completada con errores',
        details: errors.join('\n')
      });
    } else {
      notifications?.showSuccess(`${newContacts.length} contactos importados correctamente`, {
        title: 'Importación exitosa',
        details: 'Ve a la pestaña "Contactos" para seleccionarlos'
      });
    }
  };

  // Exportar contactos
  const exportContacts = () => {
    if (contacts.length === 0) {
      notifications?.showWarning('No hay contactos para exportar');
      return;
    }

    const csvContent = contacts.map(c => `${c.name},+${c.phone}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apysky-contactos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    notifications?.showSuccess('Contactos exportados correctamente');
  };

  // Seleccionar contactos y enviar al componente padre
  const handleSelectContacts = () => {
    const selectedPhones = Array.from(selectedContacts)
      .map(id => contacts.find(c => c.id === id))
      .filter(Boolean)
      .map(c => `+${c.phone}`)
      .join(', ');

    console.log('🚀 APYSKY: Transferir contactos a área principal:', selectedPhones);
    onContactsSelect(selectedPhones);
    onClose();
    notifications?.showSuccess(`${selectedContacts.size} contactos transferidos al área principal`, {
      title: '¡Contactos listos!',
      details: 'Los números ya están en el área de envío'
    });
  };

  // Filtrar contactos
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  // Componente para vista previa de importación
  const ImportPreview = ({ data }) => {
    const parsed = parseImportData(data);
    const valid = parsed.filter(p => !p.error && p.isValid);
    const invalid = parsed.filter(p => p.error || !p.isValid);

    return (
      <div style={{ fontSize: '12px' }}>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '8px' }}>
          <span style={{ color: '#25D366' }}>
            ✅ Válidos: {valid.length}
          </span>
          <span style={{ color: '#dc3545' }}>
            ❌ Errores: {invalid.length}
          </span>
          <span style={{ color: '#6c757d' }}>
            📊 Total: {parsed.length}
          </span>
        </div>
        
        {valid.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#25D366' }}>Ejemplos válidos:</strong>
            <div style={{ 
              background: 'white', 
              padding: '6px', 
              borderRadius: '4px',
              border: '1px solid #d4edda',
              marginTop: '4px'
            }}>
              {valid.slice(0, 3).map(item => (
                <div key={item.index} style={{ fontSize: '11px', color: '#495057' }}>
                  • {item.name} → +{item.cleanPhone}
                </div>
              ))}
              {valid.length > 3 && (
                <div style={{ fontSize: '11px', color: '#6c757d', fontStyle: 'italic' }}>
                  ... y {valid.length - 3} más
                </div>
              )}
            </div>
          </div>
        )}

        {invalid.length > 0 && (
          <div>
            <strong style={{ color: '#dc3545' }}>Errores encontrados:</strong>
            <div style={{ 
              background: '#fff5f5', 
              padding: '6px', 
              borderRadius: '4px',
              border: '1px solid #fed7d7',
              marginTop: '4px'
            }}>
              {invalid.slice(0, 3).map(item => (
                <div key={item.index} style={{ fontSize: '11px', color: '#721c24' }}>
                  • Línea {item.index}: {item.error || 'Número inválido'} ({item.original})
                </div>
              ))}
              {invalid.length > 3 && (
                <div style={{ fontSize: '11px', color: '#6c757d', fontStyle: 'italic' }}>
                  ... y {invalid.length - 3} errores más
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="contact-manager-modal" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div 
        className="contact-manager-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '700px', 
          height: '600px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10000,
          border: '1px solid #e0e0e0'
        }}
      >
        <div className="modal-header" style={{
          padding: '20px',
          borderBottom: '1px solid #e9ecef',
          background: 'white',
          position: 'relative',
          zIndex: 1
        }}>
          <button 
            className="back-button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              marginRight: '10px'
            }}
          >
            ← Volver
          </button>
          <h3 style={{ display: 'inline', margin: 0 }}>📱 Gestión de Contactos</h3>
        </div>

        <div className="modal-body" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          padding: '20px',
          background: 'white',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e9ecef',
            marginBottom: '20px',
            background: 'white',
            position: 'relative',
            zIndex: 2
          }}>
            {[
              { id: 'contacts', label: '👥 Contactos', count: contacts.length },
              { id: 'import', label: '📥 Importar' },
              { id: 'export', label: '📤 Exportar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 15px',
                  border: 'none',
                  background: activeTab === tab.id ? '#25D366' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6c757d',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{ 
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : '#e9ecef',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '12px'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contenido según tab activo */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'contacts' && (
              <>
                {/* Agregar contacto */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginBottom: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <input
                    type="text"
                    placeholder="Nombre del contacto"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    placeholder="+51987654321"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <button
                    onClick={addContact}
                    style={{
                      padding: '8px 15px',
                      background: '#25D366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ Agregar
                  </button>
                </div>

                {/* Buscador */}
                <input
                  type="text"
                  placeholder="🔍 Buscar contactos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px',
                    marginBottom: '15px'
                  }}
                />

                {/* Lista de contactos */}
                <div style={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px'
                }}>
                  {filteredContacts.length === 0 ? (
                    <div style={{ 
                      padding: '40px', 
                      textAlign: 'center', 
                      color: '#6c757d'
                    }}>
                      {contacts.length === 0 ? (
                        <>
                          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📱</div>
                          <p>No tienes contactos guardados</p>
                          <small>Agrega contactos manualmente o importa desde un archivo CSV</small>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                          <p>No se encontraron contactos</p>
                          <small>Intenta con otro término de búsqueda</small>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <div
                        key={contact.id}
                        style={{
                          padding: '12px 15px',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          background: selectedContacts.has(contact.id) ? '#e8f5e8' : 'transparent'
                        }}
                        onClick={() => {
                          const newSelected = new Set(selectedContacts);
                          if (newSelected.has(contact.id)) {
                            newSelected.delete(contact.id);
                          } else {
                            newSelected.add(contact.id);
                          }
                          setSelectedContacts(newSelected);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.id)}
                          onChange={() => {}} // Manejado por el onClick del div
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                            {contact.name}
                          </div>
                          <div style={{ color: '#6c757d', fontSize: '13px' }}>
                            +{contact.phone}
                          </div>
                          {contact.messagesSent > 0 && (
                            <div style={{ color: '#25D366', fontSize: '12px', marginTop: '2px' }}>
                              📨 {contact.messagesSent} mensajes enviados
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteContact(contact.id);
                          }}
                          style={{
                            background: '#fff5f5',
                            border: '1px solid #fed7d7',
                            color: '#e53e3e',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'import' && (
              <div>
                <h4>📥 Importar Contactos</h4>
                <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '15px' }}>
                  Importa contactos desde <strong>Excel, CSV o texto</strong>. Se organizarán automáticamente.
                </p>

                {/* Método 1: Subir archivo */}
                <div style={{ 
                  marginBottom: '20px',
                  padding: '15px',
                  border: '2px dashed #25D366',
                  borderRadius: '8px',
                  textAlign: 'center',
                  background: '#f0fff4'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
                  <h5 style={{ margin: '0 0 10px 0', color: '#25D366' }}>
                    Método 1: Subir Archivo Excel/CSV
                  </h5>
                  <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '15px' }}>
                    Selecciona tu archivo de Excel (.xlsx) o CSV con contactos
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <button
                    onClick={() => document.getElementById('file-upload').click()}
                    style={{
                      background: '#25D366',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '0 auto'
                    }}
                  >
                    📁 Seleccionar Archivo
                  </button>
                  <small style={{ display: 'block', marginTop: '8px', color: '#6c757d' }}>
                    Formatos: Excel (.xlsx), CSV (.csv), Texto (.txt)
                  </small>
                </div>

                {/* 🚀 BOTÓN DE IMPORTAR - DISEÑO PROFESIONAL */}
                {importData.trim() && (
                  <div style={{ 
                    margin: '15px 0',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%)',
                    border: '2px solid #25D366',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      marginBottom: '15px', 
                      fontSize: '15px', 
                      fontWeight: '600',
                      color: '#155724'
                    }}>
                      ✅ Archivo cargado: <strong>{importData.split('\n').filter(l => l.trim()).length} contactos</strong>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={importContacts}
                        style={{ 
                          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: '13px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 3px 8px rgba(37, 211, 102, 0.3)',
                          transition: 'all 0.2s ease',
                          minWidth: '110px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 5px 12px rgba(37, 211, 102, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 3px 8px rgba(37, 211, 102, 0.3)';
                        }}
                      >
                        🚀 Importar
                      </button>
                      
                      <button
                        onClick={() => setImportData('')}
                        style={{
                          background: '#fff',
                          color: '#6c757d',
                          border: '1px solid #dee2e6',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          minWidth: '80px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.borderColor = '#dc3545';
                          e.target.style.color = '#dc3545';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.borderColor = '#dee2e6';
                          e.target.style.color = '#6c757d';
                        }}
                      >
                        🗑️ Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ 
                  textAlign: 'center', 
                  margin: '20px 0',
                  color: '#6c757d',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  ──── O ────
                </div>

                {/* Método 2: Pegar datos */}
                <div style={{ marginBottom: '15px' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>
                    Método 2: Pegar desde Excel/Google Sheets
                  </h5>
                  <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '10px' }}>
                    1. Selecciona columnas en Excel/Google Sheets<br/>  
                    2. Copia (Ctrl+C)<br/>
                    3. Pega aquí abajo ↓
                  </p>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Ejemplo de formato:</strong>
                    <pre style={{ 
                      background: '#f8f9fa', 
                      padding: '10px', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      marginTop: '5px'
                    }}>
{`Juan Pérez	+51987654321
María García	+51987654322  
Carlos López	+51987654323`}
                    </pre>
                    <small style={{ color: '#6c757d' }}>
                      💡 Puede ser separado por comas, tabulaciones o espacios
                    </small>
                  </div>
                </div>

                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Pega aquí tus contactos desde Excel, Google Sheets o cualquier texto..."
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'Monaco, Consolas, monospace',
                    marginBottom: '15px',
                    background: '#fafafa'
                  }}
                />

                {/* Vista previa de importación */}
                {importData.trim() && (
                  <div style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '15px'
                  }}>
                    <h6 style={{ margin: '0 0 8px 0', color: '#495057' }}>
                      📋 Vista Previa de Importación:
                    </h6>
                    <ImportPreview data={importData} />
                  </div>
                )}


              </div>
            )}

            {activeTab === 'export' && (
              <div>
                <h4>📤 Exportar Contactos</h4>
                <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                  Descarga todos tus contactos en formato CSV para usar en otras aplicaciones.
                </p>
                <div style={{ 
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#25D366' }}>
                    {contacts.length}
                  </div>
                  <div style={{ color: '#6c757d' }}>contactos guardados</div>
                </div>
                <button
                  onClick={exportContacts}
                  disabled={contacts.length === 0}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  📤 Exportar como CSV
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          {activeTab === 'contacts' && selectedContacts.size > 0 && (
            <button 
              onClick={handleSelectContacts} 
              style={{ 
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(37, 211, 102, 0.3)',
                transition: 'all 0.2s ease',
                margin: '0 auto',
                display: 'block'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 5px 12px rgba(37, 211, 102, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 3px 8px rgba(37, 211, 102, 0.3)';
              }}
            >
              ✅ Usar Seleccionados ({selectedContacts.size})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactManager;