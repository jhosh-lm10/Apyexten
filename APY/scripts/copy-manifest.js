const fs = require('fs');
const path = require('path');

// Ruta al manifest original y destino
const srcPath = path.join(__dirname, '../public/manifest.json');
const destPath = path.join(__dirname, '../dist/manifest.json');

try {
  // Leer el archivo manifest.json original
  const manifest = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  
  // Actualizar las rutas de los scripts
  manifest.background.service_worker = 'background.js';
  
  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    manifest.content_scripts.forEach(script => {
      script.js = script.js.map(jsFile => 
        jsFile.replace('contentScript.js', 'contentScript.js')
      );
    });
  }
  
  // Escribir el archivo actualizado en dist
  fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json copiado y actualizado correctamente');
} catch (error) {
  console.error('❌ Error al copiar el manifest.json:', error);
  process.exit(1);
}
