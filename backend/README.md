# WhatsApp Scheduler API

API para programar mensajes de WhatsApp con soporte para multimedia, plantillas y envío programado.

## Características

- 🚀 Envío de mensajes programados
- 📎 Soporte para adjuntar imágenes y PDFs
- 📝 Plantillas de mensajes personalizables
- ⏱️ Delays entre mensajes para evitar bloqueos
- 🔄 Estado de envío en tiempo real
- 🔒 Autenticación segura

## Requisitos

- Node.js >= 16.0.0
- MongoDB Atlas o local
- Cuenta de WhatsApp

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/whatsapp-scheduler.git
   cd whatsapp-scheduler/backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   # Edita el archivo .env con tus credenciales
   ```

4. Inicia el servidor:
   ```bash
   # Modo desarrollo
   npm run dev
   
   # Modo producción
   npm start
   ```

## Estructura del Proyecto

```
backend/
├── config/           # Configuraciones
│   └── db.js        # Conexión a MongoDB
├── models/          # Modelos de MongoDB
│   └── ScheduledMessage.js
├── routes/          # Rutas de la API
├── middleware/      # Middlewares
├── utils/           # Utilidades
├── .env             # Variables de entorno
├── index.js         # Punto de entrada
└── package.json
```

## API Endpoints

### Mensajes

- `POST /api/messages` - Crear un nuevo mensaje programado
- `GET /api/messages` - Obtener todos los mensajes
- `GET /api/messages/:id` - Obtener un mensaje por ID
- `PUT /api/messages/:id` - Actualizar un mensaje
- `DELETE /api/messages/:id` - Eliminar un mensaje
- `GET /api/messages/pending` - Obtener mensajes pendientes (para el worker)

### Estado del Servidor

- `GET /api/status` - Verificar estado del servidor

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Servidor
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=tu_cadena_de_conexion

# WhatsApp
WHATSAPP_SESSION_DIR=./sessions

# Seguridad
JWT_SECRET=tu_clave_secreta
API_KEY=tu_api_key
```

## Uso con la Extensión

La API está diseñada para funcionar con la extensión de Chrome. Configura la URL base en la extensión a:
```
http://localhost:3000/api
```

## Desarrollo

- **Linting**: `npm run lint`
- **Formateo**: `npm run format`
- **Pruebas**: `npm test`

## Despliegue

1. Configura las variables de entorno en producción
2. Usa PM2 para manejar el proceso:
   ```bash
   npm install -g pm2
   pm2 start index.js --name "whatsapp-scheduler"
   pm2 save
   pm2 startup
   ```

## Seguridad

- Usa HTTPS en producción
- Protege los endpoints con autenticación
- No expongas credenciales en el código
- Usa variables de entorno para datos sensibles

## Licencia

ISC

---

Desarrollado con ❤️ para APY Extend
