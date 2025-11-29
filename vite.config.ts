import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // Ensures assets are loaded correctly on GitHub Pages subpaths
    define: {
      // Injects the API key into the built code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // Polyfill for other process.env accesses to avoid runtime errors
      'process.env': {}
    },
    build: {
      outDir: 'dist',
    }
  };
});