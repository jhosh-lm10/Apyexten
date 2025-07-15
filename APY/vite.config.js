import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configure React plugin with Babel for JSX
const reactConfig = {
  babel: {
    presets: ['@babel/preset-react'],
    plugins: ['@babel/plugin-transform-react-jsx']
  }
};
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(reactConfig),
    {
      name: 'copy-manifest',
      closeBundle() {
        try {
          // Leer el manifest original
          const manifestPath = resolve(__dirname, 'public/manifest.json');
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          
          // Asegurarse de que las rutas sean correctas
          manifest.background.service_worker = 'background.js';
          
          // Escribir el manifest en la carpeta de salida
          const outputPath = resolve(__dirname, 'dist/manifest.json');
          fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
          console.log('✅ Manifest copiado correctamente');
        } catch (error) {
          console.error('❌ Error copiando el manifest:', error);
          throw error;
        }
      }
    },
    viteStaticCopy({
      targets: [
        {
          src: 'public/assets/*',
          dest: './assets/'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.js'),
        'contentScript': resolve(__dirname, 'src/contentScript.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Mantener el nombre original del archivo para contentScript.js
          if (chunkInfo.name === 'contentScript') {
            return 'contentScript.js';
          }
          // Mantener el nombre original para background.js
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          // Para el resto, usar el formato por defecto
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  publicDir: 'public',
  base: './',
});
