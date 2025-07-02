import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
      input: {
        main: './index.html',
        embed: './src/embed/index.tsx'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'embed' ? 'embed.js' : 'assets/[name]-[hash].js';
        }
      }
    }
  }
});