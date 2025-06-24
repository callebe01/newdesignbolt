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
      output: {
        manualChunks: {
          // Split React and React DOM into their own chunk
          react: ['react', 'react-dom'],
          // Split React Router into its own chunk
          router: ['react-router-dom'],
          // Split Supabase into its own chunk
          supabase: ['@supabase/supabase-js'],
          // Split Lucide icons into their own chunk
          icons: ['lucide-react'],
          // Split other large dependencies
          vendor: ['date-fns', 'recharts'],
        },
      },
    },
    // Increase the chunk size warning limit to 1000kb
    chunkSizeWarningLimit: 1000,
  },
});