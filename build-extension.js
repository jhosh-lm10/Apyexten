// build-extension.js
// Script para automatizar todo el proceso de compilación, verificación y preparación para cargar la extensión

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const distDir = path.resolve('./dist');

async function buildExtension() {
  try {
    console.log('🚀 Iniciando proceso de compilación de la extensión...\n');
    
    // Paso 1: Limpiar directorio dist si existe
    if (fs.existsSync(distDir)) {
      console.log('🧹 Limpiando directorio dist...');
      fs.rmSync(distDir, { recursive: true, force: true });
      console.log('✅ Directorio dist limpiado correctamente\n');
    }
    
    // Paso 2: Compilar la extensión
    console.log('🔨 Compilando la extensión...');
    await execAsync('npm run build');
    console.log('✅ Extensión compilada correctamente\n');
    
    // Paso 3: Verificar que contentScript.js existe, si no, renombrarlo
    console.log('🔍 Verificando archivos de la extensión...');
    if (!fs.existsSync(path.join(distDir, 'contentScript.js')) && fs.existsSync(path.join(distDir, 'content.js'))) {
      console.log('⚠️ contentScript.js no encontrado, pero content.js sí. Renombrando...');
      fs.copyFileSync(
        path.join(distDir, 'content.js'),
        path.join(distDir, 'contentScript.js')
      );
      console.log('✅ Archivo contentScript.js creado correctamente');
    }
    
    // Paso 4: Verificar manifest.json
    const manifestPath = path.join(distDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      console.log('🔍 Verificando manifest.json...');
      
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
        console.log('⚠️ Actualizando manifest.json para usar contentScript.js...');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('✅ manifest.json actualizado correctamente');
      } else {
        console.log('✅ manifest.json ya está configurado correctamente');
      }
    }
    
    // Paso 5: Ejecutar verificación final
    console.log('\n🔍 Ejecutando verificación final...');
    await execAsync('npm run verify');
    
    console.log('\n🎉 ¡Proceso completado con éxito! La extensión está lista para ser cargada en Chrome.');
    console.log('📁 La extensión se encuentra en el directorio: ' + distDir);
    console.log('🔌 Para cargarla, ve a chrome://extensions/, activa el modo desarrollador y haz clic en "Cargar descomprimida".');
    
  } catch (error) {
    console.error('\n❌ Error durante el proceso de compilación:', error.message || error);
    
    if (error.stdout) console.log('Salida estándar:', error.stdout);
    if (error.stderr) console.error('Error estándar:', error.stderr);
    
    process.exit(1);
  }
}

buildExtension(); 