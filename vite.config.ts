import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using '.' instead of process.cwd() to avoid TS error about missing types for process.cwd()
  const env = loadEnv(mode, '.', '');
  
  // On Vercel, system env vars (like API_KEY) are available in process.env.
  // loadEnv loads from .env files. We combine them to ensure we catch the key.
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // This ensures process.env.API_KEY is replaced with the actual string value during build
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    server: {
      port: 3000
    }
  };
});