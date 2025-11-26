import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: cast process to any to avoid type error regarding cwd
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Maps process.env.API_KEY in your code to the environment variable provided by Vercel
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});