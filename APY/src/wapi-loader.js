// wapi-loader.js — inyecta Store y expone WAPI.sendMessage
(() => {
  if (window.WAPI) return; // Ya inyectado

  /**
   * Busca el objeto Store interno de WhatsApp analizando los módulos de webpack
   */
  function getStore() {
    // Detectar el nombre real del chunk global (varía a menudo)
    const chunkKeys = Object.keys(window).filter(k => k.startsWith('webpackChunk'));
    for (const key of chunkKeys) {
      try {
        const modules = window[key].push([
          ['parasite'],
          {},
          (req) => Object.values(req.c)
        ]).pop();

        for (const m of modules) {
          if (m?.Chat && m?.Msg && m?.sendTextMsgToChat) {
            return m; // Estructura clásica
          }
          // Algunas versiones exportan en .default
          if (m?.default?.Chat && m.default.Msg && m.default.sendTextMsgToChat) {
            return m.default;
          }
        }
      } catch (e) {
        // Silenciar errores y continuar con la siguiente clave
      }
    }
    return null;
  }

  const Store = getStore();
  if (!Store) {
    console.error('WAPI: Store no encontrado');
    return;
  }

  window.Store = Store;
  window.WAPI = {
    sendMessage: async (jid, text) => {
      const chat = await Store.Chat.find(jid);
      return Store.sendTextMsgToChat(chat, text);
    },
    isReady: true,
    isLoggedIn: () => {
      try {
        return Store.State?.Socket?.state === 'CONNECTED';
      } catch {
        return true;
      }
    }
  };

  console.log('WAPI inyectado ✔');
})();
