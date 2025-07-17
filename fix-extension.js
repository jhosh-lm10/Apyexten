/**
 * Script para verificar y solucionar problemas con la extensión APYSKY WhatsApp Sender Pro
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== APYSKY WhatsApp Sender Pro - Herramienta de solución de problemas ===\n');

try {
  // Verificar que la carpeta dist existe
  if (!fs.existsSync('./dist')) {
    console.log('La carpeta dist no existe. Compilando la extensión...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✓ Extensión compilada correctamente');
  } else {
    console.log('✓ Carpeta dist encontrada');
  }

  // Verificar que los archivos principales existen en dist
  const requiredFiles = ['contentScript.js', 'background.js', 'popup.js', 'index.html', 'manifest.json'];
  const missingFiles = [];

  for (const file of requiredFiles) {
    if (!fs.existsSync(`./dist/${file}`)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.log('Faltan los siguientes archivos en la carpeta dist:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
    console.log('Recompilando la extensión...');
    
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✓ Extensión recompilada correctamente');
  } else {
    console.log('✓ Todos los archivos principales existen');
  }

  // Verificar el manifest.json
  const manifestPath = './dist/manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Verificar que contentScript.js está en web_accessible_resources
  let contentScriptAccessible = false;
  for (const resource of manifest.web_accessible_resources) {
    if (resource.resources.includes('contentScript.js')) {
      contentScriptAccessible = true;
      break;
    }
  }

  if (!contentScriptAccessible) {
    console.log('contentScript.js no está en web_accessible_resources. Actualizando manifest.json...');
    
    // Añadir contentScript.js a web_accessible_resources
    manifest.web_accessible_resources[0].resources.push('contentScript.js');
    
    // Guardar el manifest actualizado
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✓ manifest.json actualizado correctamente');
  } else {
    console.log('✓ contentScript.js está en web_accessible_resources');
  }

  console.log('\n✓ Verificación completa. La extensión debería funcionar correctamente.');
  console.log('\nInstrucciones:');
  console.log('1. Ve a chrome://extensions/');
  console.log('2. Activa el "Modo desarrollador" en la esquina superior derecha');
  console.log('3. Haz clic en "Cargar descomprimida" y selecciona la carpeta dist');
  console.log('4. Abre WhatsApp Web y prueba la extensión');
  console.log('\nSi sigues teniendo problemas, consulta el archivo TROUBLESHOOTING.md');

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} 