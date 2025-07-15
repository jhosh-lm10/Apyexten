// wapi-loader.js — inyecta Store y expone WAPI.sendMessage
(function () {
  if (window.WAPI) return;                 // ya inyectado

  function getStore() {
    const mods = window.webpackChunkwhatsapp_web_client?.push(
      [['parasite'], {}, e => Object.values(e.c)]
    )?.[1] ?? [];

    for (const m of mods) {
      if (m?.Chat && m?.Msg && m?.sendTextMsgToChat) return m;
    }
    return null;
  }

  const Store = getStore();
  if (!Store) { console.error('WAPI: Store no encontrado'); return; }

  window.Store = Store;
  window.WAPI = {
    sendMessage: async (jid, text) => {
      const chat = await Store.Chat.find(jid);
      return Store.sendTextMsgToChat(chat, text);
    }
  };
  console.log('WAPI inyectado ✔');
})();
