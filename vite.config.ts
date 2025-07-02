import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
        main: path.resolve(__dirname, 'index.html'),
        'embed-widget': path.resolve(__dirname, 'src/embed/index.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Place embed-widget.js directly in the root of dist
          if (chunkInfo.name === 'embed-widget') {
            return 'embed-widget.js';
          }
          // Keep other files in assets folder
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});