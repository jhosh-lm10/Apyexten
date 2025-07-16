import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Configuración básica de Vite para extensiones de Chrome
export default defineConfig({
  plugins: [
    react(),
    // Copiar archivos estáticos necesarios
    viteStaticCopy({
      targets: [
        { src: 'public/manifest.json', dest: '.' },
        { src: 'public/assets/*', dest: 'assets' },
        { src: 'src/wapi-loader.js', dest: '.' },
        { src: 'src/contentScript.js', dest: '.' },
        { src: 'popup.html', dest: '.' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/main.jsx'),
        background: resolve(__dirname, 'src/background.js')
      },
      output: {
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Asegurar que el entry point se llame popup.js
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'popup' ? 'popup.js' : '[name].js';
        }
      }
    }
  },
  publicDir: 'public',
  base: './',
  server: {
    port: 3000,
    open: true
  }
});
