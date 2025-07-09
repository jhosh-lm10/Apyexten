function Popup() {
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 5); // Por defecto, 5 minutos en el futuro
    return date;
  });
  const [showScheduled, setShowScheduled] = useState(false);

  // Configuración mejorada del editor
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image',
    'color', 'background'
  ];

  // Función para verificar si estamos en el entorno de extensión
  const isExtensionEnvironment = () => {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  };

  // Función para obtener datos del almacenamiento
  const getStorageData = async (keys) => {
    if (isExtensionEnvironment()) {
      return await chrome.storage.local.get(keys);
    } else {
      // Modo desarrollo: usar localStorage
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value !== null) {
            result[key] = JSON.parse(value);
          }
        });
      } else if (typeof keys === 'string') {
        const value = localStorage.getItem(keys);
        if (value !== null) {
          result[keys] = JSON.parse(value);
        }
      } else if (keys === null) {
        // Obtener todas las claves
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          result[key] = JSON.parse(localStorage.getItem(key));
        }
      }
      return result;
    }
  };

  // Función para guardar datos en el almacenamiento
  const setStorageData = async (data) => {
    if (isExtensionEnvironment()) {
      await chrome.storage.local.set(data);
    } else {
      // Modo desarrollo: usar localStorage
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    }
  };

  // Cargar datos al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await getStorageData(['templates', 'scheduledMessages']);
        if (result.templates) {
          setTemplates(result.templates);
        }
        if (result.scheduledMessages) {
          setScheduledMessages(result.scheduledMessages);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };
    
    loadData();
    
    // Solo configurar el intervalo en el entorno de extensión
    if (isExtensionEnvironment()) {
      const interval = setInterval(checkScheduledMessages, 60000);
      return () => clearInterval(interval);
    }
  }, []);
  
  // Verificar mensajes programados
  const checkScheduledMessages = async () => {
    if (!isExtensionEnvironment()) return;
    
    const now = new Date();
    const result = await getStorageData('scheduledMessages');
    const messages = result.scheduledMessages || [];
    
    const messagesToSend = messages.filter(msg => new Date(msg.scheduledTime) <= now);
    const remainingMessages = messages.filter(msg => new Date(msg.scheduledTime) > now);
    
    if (messagesToSend.length > 0) {
      // Enviar mensajes programados
      for (const message of messagesToSend) {
        await sendScheduledMessage(message);
      }
      
      // Actualizar almacenamiento
      await setStorageData({ scheduledMessages: remainingMessages });
      setScheduledMessages(remainingMessages);
      
      // Notificación
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Mensajes Enviados',
          message: `Se han enviado ${messagesToSend.length} mensajes programados`
        });
      } else {
        console.log(`Se habrían enviado ${messagesToSend.length} mensajes programados`);
      }
    }
  };
  
  // Enviar mensaje programado
  const sendScheduledMessage = async (messageData) => {
    const { numbers, content } = messageData;
    try {
      const [tab] = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      if (tab) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (nums, msg) => {
            window.postMessage({ 
              type: 'APYSKY_SEND', 
              numeros: nums, 
              mensaje: msg 
            }, '*');
          },
          args: [numbers, content]
        });
      } else {
        console.error('No se encontró una pestaña de WhatsApp Web abierta');
      }
    } catch (error) {
      console.error('Error al enviar mensaje programado:', error);
    }
  };
  
  // Programar mensaje
  const scheduleMessage = async () => {
    const nums = numbers.split('\n').map(n => n.trim()).filter(Boolean);
    if (!nums.length || !message) return alert("Faltan datos");
    
    const newMessage = {
      id: Date.now().toString(),
      name: `Mensaje para ${nums.length} contacto${nums.length > 1 ? 's' : ''}`,
      content: message,
      numbers: nums,
      scheduledTime: scheduleDate.toISOString(),
      createdAt: new Date().toISOString(),
      status: 'scheduled'
    };
    
    const updatedMessages = [...scheduledMessages, newMessage];
    await setStorageData({ scheduledMessages: updatedMessages });
    setScheduledMessages(updatedMessages);
    
    // Limpiar formulario
    setNumbers('');
    setMessage('');
    
    // Notificación
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Mensaje Programado',
        message: `Mensaje programado para ${formatDateTime(scheduleDate)}`
      });
    } else {
      console.log(`Mensaje programado para ${formatDateTime(scheduleDate)}`);
    }
  };
  
  // Cancelar mensaje programado
  const cancelScheduledMessage = async (id) => {
    if (window.confirm('¿Estás seguro de cancelar este mensaje programado?')) {
      const updatedMessages = scheduledMessages.filter(msg => msg.id !== id);
      await setStorageData({ scheduledMessages: updatedMessages });
      setScheduledMessages(updatedMessages);
    }
  };

  // Guardar plantilla
  const saveTemplate = async (template) => {
    let updatedTemplates;
    
    if (template.id) {
      // Actualizar plantilla existente
      updatedTemplates = templates.map(t => t.id === template.id ? template : t);
    } else {
      // Crear nueva plantilla
      updatedTemplates = [
        ...templates, 
        { 
          ...template, 
          id: Date.now().toString(), 
          createdAt: new Date().toISOString() 
        }
      ];
    }
    
    await setStorageData({ templates: updatedTemplates });
    setTemplates(updatedTemplates);
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  // Eliminar plantilla
  const deleteTemplate = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
      const updatedTemplates = templates.filter(t => t.id !== id);
      await setStorageData({ templates: updatedTemplates });
      setTemplates(updatedTemplates);
    }
  };

  // Aplicar plantilla al editor
  const applyTemplate = (template) => {
    setMessage(template.content);
    setShowTemplates(false);
  };

  // Abrir vista previa de plantilla
  const openPreview = (template) => {
    setPreviewTemplate(template);
  };
