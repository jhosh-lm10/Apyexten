import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolver correctamente __dirname, compatible con Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta de salida del build
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Lista de archivos que deben existir una vez finalizado el build
const REQUIRED_FILES = [
  'manifest.json',
  'background.js',
  'contentScript.js',
  'wapi-loader.js',
  'popup.html',
  'popup.js'
];

let allOk = true;

for (const file of REQUIRED_FILES) {
  const filePath = path.join(DIST_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ FALTA: ${file}`);
    allOk = false;
  } else {
    console.log(`✔ Encontrado: ${file}`);
  }
}

if (!allOk) {
  console.error('\n⛔  Verificación de build falló. Asegúrate de que los archivos anteriores existan en la carpeta dist.');
  process.exit(1);
}

console.log('\n✅  Build verificado correctamente. Todos los archivos requeridos están presentes.'); 