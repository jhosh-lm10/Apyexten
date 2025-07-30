// verify-extension.js
// Script para verificar que la extensión esté correctamente configurada antes de cargarla en Chrome

import fs from 'fs';
import path from 'path';

const distDir = path.resolve('./dist');
let errors = 0;

console.log('Verificando configuración de la extensión...');

// Verificar que existan los archivos principales
const requiredFiles = [
  'manifest.json',
  'contentScript.js',
  'background.js',
  'index.html'
];

requiredFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: No se encontró el archivo ${file}`);
    errors++;
  } else {
    console.log(`✅ ${file} encontrado correctamente`);
  }
});

// Verificar manifest.json
const manifestPath = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Verificar que el manifest tenga las propiedades necesarias
    const requiredProps = [
      'manifest_version',
      'name',
      'version',
      'action',
      'permissions',
      'host_permissions',
      'background',
      'content_scripts'
    ];
    
    requiredProps.forEach(prop => {
      if (!manifest[prop]) {
        console.error(`❌ ERROR: manifest.json no tiene la propiedad ${prop}`);
        errors++;
      } else {
        console.log(`✅ manifest.json contiene ${prop}`);
      }
    });
    
    // Verificar content_scripts
    if (manifest.content_scripts && Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0) {
      const contentScript = manifest.content_scripts[0];
      if (!contentScript.js || !Array.isArray(contentScript.js) || !contentScript.js.includes('contentScript.js')) {
        console.error('❌ ERROR: content_scripts no incluye contentScript.js');
        errors++;
      } else {
        console.log('✅ content_scripts incluye contentScript.js');
      }
    }
    
    // Verificar background
    if (manifest.background && manifest.background.service_worker !== 'background.js') {
      console.error('❌ ERROR: background.service_worker no es background.js');
      errors++;
    } else {
      console.log('✅ background.service_worker es background.js');
    }
  } catch (error) {
    console.error('❌ ERROR: No se pudo leer o parsear manifest.json', error);
    errors++;
  }
}

// Verificar que contentScript.js no esté vacío
const contentScriptPath = path.join(distDir, 'contentScript.js');
if (fs.existsSync(contentScriptPath)) {
  const contentScriptSize = fs.statSync(contentScriptPath).size;
  if (contentScriptSize < 100) {
    console.error(`❌ ERROR: contentScript.js parece estar vacío o es muy pequeño (${contentScriptSize} bytes)`);
    errors++;
  } else {
    console.log(`✅ contentScript.js tiene un tamaño adecuado (${contentScriptSize} bytes)`);
  }
}

// Verificar que background.js no esté vacío
const backgroundPath = path.join(distDir, 'background.js');
if (fs.existsSync(backgroundPath)) {
  const backgroundSize = fs.statSync(backgroundPath).size;
  if (backgroundSize < 100) {
    console.error(`❌ ERROR: background.js parece estar vacío o es muy pequeño (${backgroundSize} bytes)`);
    errors++;
  } else {
    console.log(`✅ background.js tiene un tamaño adecuado (${backgroundSize} bytes)`);
  }
}

// Verificar que index.html no esté vacío
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexSize = fs.statSync(indexPath).size;
  if (indexSize < 100) {
    console.error(`❌ ERROR: index.html parece estar vacío o es muy pequeño (${indexSize} bytes)`);
    errors++;
  } else {
    console.log(`✅ index.html tiene un tamaño adecuado (${indexSize} bytes)`);
  }
}

if (errors > 0) {
  console.error(`\n❌ Se encontraron ${errors} errores. Por favor, corríjalos antes de cargar la extensión.`);
  process.exit(1);
} else {
  console.log('\n✅ La extensión está correctamente configurada y lista para ser cargada.');
} 