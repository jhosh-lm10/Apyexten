import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      babel: {
        plugins: ['@babel/plugin-transform-react-jsx']
      }
    }),
    {
      name: 'copy-manifest',
      closeBundle() {
        try {
          const manifestPath = resolve(__dirname, 'public/manifest.json');
          const outputPath = resolve(__dirname, 'dist/manifest.json');
          fs.mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
          fs.copyFileSync(manifestPath, outputPath);
          console.log('✅ Manifest copiado correctamente');
        } catch (error) {
          console.error('❌ Error copiando el manifest:', error);
        }
      }
    },
    viteStaticCopy({
      targets: [
        { src: 'public/assets/*', dest: './assets/' },
        { src: 'src/wapi-loader.js', dest: './' }
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
        contentScript: resolve(__dirname, 'src/contentScript.js'),
        'wapi-loader': resolve(__dirname, 'src/wapi-loader.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  publicDir: 'public',
  base: './',
  server: {
    port: 3000
  }
});
