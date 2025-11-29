import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // IMPORTANTE: Esta ruta debe coincidir exactamente con el nombre de tu repositorio en GitHub
    base: '/CashFlow259/', 
    define: {
      // Injects the API key into the built code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY),
      // Polyfill for other process.env accesses to avoid runtime errors
      'process.env': {}
    },
    build: {
      outDir: 'dist',
    }
  };
});