import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize chunk splitting to reduce bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // UI libraries chunk
          ui: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/modifiers'],
          // Utility libraries chunk
          utils: ['localforage', 'miragejs', '@emailjs/browser'],
          // Window utilities chunk
          window: ['react-window', 'react-window-infinite-loader']
        }
      }
    },
    // Increase chunk size warning limit since we have a comprehensive app
    chunkSizeWarningLimit: 600
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'localforage',
      'miragejs',
      '@emailjs/browser'
    ]
  },
  // Define environment variables that should be available in production
  define: {
    // Ensure environment variables are properly handled
    __VITE_HR_MASTER__: JSON.stringify(process.env.VITE_HR_MASTER || 'demo_password')
  }
})
