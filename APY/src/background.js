chrome.runtime.onInstalled.addListener(() => {
    console.log('Apysky instalada');
  });
  
  // 📄 src/contentScript.js
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.data.type !== 'APYSKY_SEND') return;
  
    const { numeros, mensaje } = event.data;
  
    for (let i = 0; i < numeros.length; i++) {
      const numero = numeros[i];
      const url = `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
      await new Promise(r => setTimeout(r, 5000));
    }
  });
  