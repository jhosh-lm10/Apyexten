import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { 
          src: 'public/manifest.json', 
          dest: './' 
        },
        {
          src: 'public/assets/*',
          dest: './assets/'
        },
        // Copiar contentScript.js sin modificaciones para evitar que Rollup lo convierta en ES module
        {
          src: 'src/contentScript.js',
          dest: './'
        },
        // Copiar loader que se ejecuta en document_start
        {
          src: 'src/pageInjectLoader.js',
          dest: './'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Mantener el nombre exacto para los scripts principales
          if (['contentScript', 'background'].includes(chunkInfo.name)) {
            return `${chunkInfo.name}.js`;
          }
          return '[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  publicDir: 'public',
  base: './',
});