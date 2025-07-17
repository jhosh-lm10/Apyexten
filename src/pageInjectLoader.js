(function() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injectScript.js');
    script.type = 'module';
    // Insertar lo más pronto posible
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.error('APYSKY Loader: Error al inyectar injectScript.js', e);
  }
})(); 