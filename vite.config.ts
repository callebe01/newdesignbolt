import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Handle client-side routing in development
    historyApiFallback: true,
  },
  build: {
    rollupOptions: {
      input: 'src/main.tsx'
    }
  }
});