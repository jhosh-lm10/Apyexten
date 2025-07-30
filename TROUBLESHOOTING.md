# Solución de problemas - APYSKY WhatsApp Sender Pro

## Problemas comunes y soluciones

### 1. Error "Could not establish connection. Receiving end does not exist."

Este error ocurre cuando el background script intenta comunicarse con el content script, pero este último no está correctamente inyectado o inicializado en la página de WhatsApp Web.

**Soluciones:**

1. **Recarga la extensión:**
   - Ve a `chrome://extensions/`
   - Busca "Apysky WhatsApp Sender Pro"
   - Haz clic en el botón de recarga (icono circular)

2. **Recarga WhatsApp Web:**
   - Cierra la pestaña de WhatsApp Web
   - Abre una nueva pestaña y navega a `https://web.whatsapp.com`
   - Espera a que se cargue completamente

3. **Reinstala la extensión:**
   - Ve a `chrome://extensions/`
   - Elimina la extensión
   - Vuelve a cargarla desde la carpeta `dist`

### 2. Error "Refused to execute inline script because it violates the following Content Security Policy directive"

Este error ocurre debido a las restricciones de seguridad de WhatsApp Web que impiden la ejecución de scripts en línea.

**Soluciones:**

1. **La extensión ahora usa un enfoque basado en UI:**
   - Hemos actualizado la extensión para usar la interfaz de usuario de WhatsApp Web en lugar de inyectar scripts
   - No deberías ver este error con la última versión
   - Si sigues viendo el error, reinstala la extensión

2. **Asegúrate de tener la última versión:**
   - Compila la extensión con `npm run build`
   - Reinstala la extensión desde la carpeta `dist`

### 3. WhatsApp Web no se carga correctamente

**Soluciones:**

1. **Asegúrate de tener una sesión activa:**
   - Abre WhatsApp Web en una pestaña normal
   - Escanea el código QR si es necesario
   - Verifica que puedes enviar y recibir mensajes normalmente

2. **Limpia la caché:**
   - Ve a la configuración de Chrome
   - Navega a "Privacidad y seguridad" > "Borrar datos de navegación"
   - Selecciona "Cookies y datos de sitios" y "Imágenes y archivos almacenados en caché"
   - Haz clic en "Borrar datos"

### 4. Los mensajes no se envían

**Soluciones:**

1. **Verifica la conexión a Internet:**
   - Asegúrate de tener una conexión a Internet estable

2. **Verifica el formato del número:**
   - Los números deben incluir el código de país (sin el signo +)
   - Ejemplo: `5219876543210` (México)

3. **Verifica el estado de WhatsApp Web:**
   - Asegúrate de que WhatsApp Web esté abierto y conectado
   - Intenta enviar un mensaje manualmente para verificar

4. **Verifica los logs de la consola:**
   - Abre la consola de desarrollador (F12 o Ctrl+Shift+I)
   - Busca errores relacionados con APYSKY

5. **Espera a que WhatsApp Web esté completamente cargado:**
   - La extensión ahora espera a que WhatsApp Web esté completamente cargado antes de enviar mensajes
   - Asegúrate de que la interfaz de WhatsApp Web esté completamente cargada antes de intentar enviar mensajes

### 5. La extensión no aparece o no funciona después de instalarla

**Soluciones:**

1. **Verifica que la extensión esté habilitada:**
   - Ve a `chrome://extensions/`
   - Asegúrate de que el interruptor de la extensión esté activado

2. **Reinicia Chrome:**
   - Cierra completamente Chrome
   - Vuelve a abrirlo

3. **Verifica los permisos:**
   - Haz clic derecho en el icono de la extensión
   - Selecciona "Opciones" o "Administrar extensión"
   - Verifica que todos los permisos necesarios estén concedidos

### 6. Sobre el nuevo enfoque basado en UI

En la última versión de la extensión, hemos cambiado a un enfoque basado en la interfaz de usuario de WhatsApp Web en lugar de intentar acceder a la API interna. Esto se debe a que WhatsApp Web tiene restricciones de seguridad que impiden la inyección de scripts.

**Ventajas del nuevo enfoque:**
- Mayor compatibilidad con las restricciones de seguridad de WhatsApp Web
- Menos propenso a romperse con las actualizaciones de WhatsApp Web
- Más estable y confiable

**Desventajas:**
- Puede ser un poco más lento que el enfoque basado en API
- Requiere que la interfaz de WhatsApp Web esté visible
- Puede ser afectado por cambios en la interfaz de WhatsApp Web

## Contacto para soporte

Si continúas teniendo problemas, por favor contacta al equipo de soporte de APYSKY:

- Email: soporte@apysky.com
- Sitio web: https://apysky.com/soporte 