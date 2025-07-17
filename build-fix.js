// build-fix.js
// Script para verificar y corregir los nombres de archivo después de la compilación

import fs from 'fs';
import path from 'path';

const distDir = path.resolve('./dist');

console.log('Verificando archivos compilados...');

// Verificar si existe content.js y contentScript.js no existe
if (fs.existsSync(path.join(distDir, 'content.js')) && !fs.existsSync(path.join(distDir, 'contentScript.js'))) {
  console.log('Encontrado content.js, renombrando a contentScript.js...');
  
  // Copiar content.js a contentScript.js
  fs.copyFileSync(
    path.join(distDir, 'content.js'),
    path.join(distDir, 'contentScript.js')
  );
  
  console.log('Archivo contentScript.js creado correctamente');
  
  // Verificar manifest.json para asegurar que usa contentScript.js
  const manifestPath = path.join(distDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log('Verificando manifest.json...');
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let updated = false;
    
    // Verificar content_scripts
    if (manifest.content_scripts && Array.isArray(manifest.content_scripts)) {
      manifest.content_scripts.forEach(script => {
        if (script.js && Array.isArray(script.js)) {
          const contentIndex = script.js.indexOf('content.js');
          if (contentIndex !== -1) {
            script.js[contentIndex] = 'contentScript.js';
            updated = true;
          }
        }
      });
    }
    
    // Guardar manifest actualizado si fue modificado
    if (updated) {
      console.log('Actualizando manifest.json para usar contentScript.js...');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('manifest.json actualizado correctamente');
    } else {
      console.log('manifest.json ya está configurado correctamente');
    }
  }
} else if (fs.existsSync(path.join(distDir, 'contentScript.js'))) {
  console.log('contentScript.js ya existe, no es necesario renombrar');
} else {
  console.error('No se encontró ni content.js ni contentScript.js. Verifica la compilación.');
}

console.log('Verificación de archivos completada'); 