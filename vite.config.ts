import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded correctly on GitHub Pages subpaths
  define: {
    'process.env': {} // Polyfill to prevent crashes if process.env is accessed
  },
  build: {
    outDir: 'dist',
  }
});