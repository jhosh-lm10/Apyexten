# APYSKY WhatsApp Sender Pro

## Descripción
APYSKY WhatsApp Sender Pro es una extensión de Chrome que permite enviar mensajes masivos en WhatsApp Web de manera eficiente y automatizada. La extensión utiliza la interfaz de usuario de WhatsApp Web para enviar mensajes, lo que garantiza una alta compatibilidad y estabilidad.

## Características principales
- Envío directo de mensajes a múltiples contactos
- Sistema de cola para envío masivo con control de velocidad
- Programación de mensajes para envío automático
- Plantillas de mensajes reutilizables
- Interfaz de usuario intuitiva

## Instalación
1. Clona este repositorio o descarga el código fuente
2. Abre Chrome y navega a `chrome://extensions/`
3. Activa el "Modo desarrollador" en la esquina superior derecha
4. Haz clic en "Cargar descomprimida" y selecciona la carpeta `dist` (después de compilar)
5. La extensión debería aparecer en tu barra de herramientas

## Compilación
Para compilar la extensión, sigue estos pasos:

```bash
# Instalar dependencias
npm install

# Compilar la extensión
npm run build
```

La extensión compilada estará disponible en la carpeta `dist`.

## Uso
1. Haz clic en el icono de la extensión para abrir el popup
2. Asegúrate de tener WhatsApp Web abierto y escaneado con tu teléfono
3. Ingresa los números de teléfono (con código de país) en el área de texto
4. Escribe el mensaje que deseas enviar
5. Haz clic en "Enviar" para iniciar el envío

### Envío programado
1. Ingresa los números de teléfono y el mensaje
2. Selecciona la fecha y hora para el envío
3. Haz clic en "Programar" para guardar el envío programado

### Plantillas
1. Crea plantillas para mensajes frecuentes desde la sección "Plantillas"
2. Selecciona una plantilla para usarla en tu mensaje actual

## Funcionamiento técnico
La extensión utiliza un enfoque basado en la interfaz de usuario de WhatsApp Web:

1. **Automatización de la interfaz**: Simula interacciones con la interfaz de usuario de WhatsApp Web para enviar mensajes.
2. **Sistema de cola**: Implementa un sistema de cola para gestionar envíos masivos con retrasos configurables.
3. **Detección inteligente**: Detecta automáticamente cuando WhatsApp Web está completamente cargado y listo para enviar mensajes.
4. **Comunicación entre scripts**: Utiliza un sistema de mensajes entre el script de fondo y el script de contenido.

## Solución de problemas
Si encuentras algún problema al usar la extensión, consulta el archivo [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para obtener ayuda.

También puedes ejecutar el script de solución de problemas:
```bash
node fix-extension.cjs
```

## Advertencias
- El uso excesivo de envíos masivos puede resultar en la suspensión de tu cuenta de WhatsApp.
- Esta extensión está diseñada para fines legítimos como marketing y comunicación con clientes. No la uses para spam.
- WhatsApp Web puede cambiar su interfaz en cualquier momento, lo que podría afectar el funcionamiento de la extensión.

## Mantenimiento
Para mantener la extensión funcionando con futuras actualizaciones de WhatsApp Web, es posible que necesites actualizar los selectores CSS en `contentScript.js` si la interfaz de WhatsApp Web cambia.

## Licencia
Este proyecto es de código abierto y está disponible bajo la licencia MIT.
