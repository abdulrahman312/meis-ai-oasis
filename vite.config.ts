import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using '.' instead of process.cwd() to avoid TS error about missing types for process.cwd()
  const env = loadEnv(mode, '.', '');
  
  // Logic to resolve the API Key:
  // 1. process.env.API_KEY: Set in Vercel Dashboard (Production)
  // 2. env.API_KEY: Standard .env file
  // 3. env.GEMINI_API_KEY: Specific local dev key requested (.env.local)
  const apiKey = process.env.API_KEY || env.API_KEY || env.GEMINI_API_KEY;

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