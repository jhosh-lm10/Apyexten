import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './popup.css';

function Popup() {
  const [numbers, setNumbers] = useState('');
  // Rich text editor value stored as HTML
  const [message, setMessage] = useState('');

  // Toolbar options for basic formatting
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['link'],
      ['clean']
    ]
  };

  const formats = ['bold', 'italic', 'underline', 'link'];

  const handleSend = async () => {
    const nums = numbers.split('\n').map(n => n.trim()).filter(Boolean);
    if (!nums.length || !message) return alert("Faltan datos");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (nums, msg) => window.postMessage({ type: 'APYSKY_SEND', numeros: nums, mensaje: msg }, '*'),
      args: [nums, message]
    });
  };

  return (
    <div style={{ padding: '10px', width: '300px', fontFamily: 'Arial' }}>
      <h2 style={{ color: '#b30000' }}>Apysky</h2>
      <textarea placeholder="Números (uno por línea)" value={numbers} onChange={e => setNumbers(e.target.value)} style={{ width: '100%', height: '60px', marginBottom: '10px' }} />
      <ReactQuill
        placeholder="Mensaje"
        value={message}
        onChange={setMessage}
        modules={modules}
        formats={formats}
        style={{ marginBottom: '10px' }}
      />
      <button onClick={handleSend} style={{ width: '100%', backgroundColor: '#b30000', color: '#fff', padding: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Enviar mensajes</button>
    </div>
  );
}
export default Popup;