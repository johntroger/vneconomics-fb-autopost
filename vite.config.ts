import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('viem') || id.includes('@noble') || id.includes('abitype')) {
              return 'vendor-web3';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lucide-react') || id.includes('dompurify')) {
              return 'vendor-ui';
            }
          }
          if (id.includes('src/data/catalog.json')) {
            return 'vne-catalog-vi';
          }
          if (id.includes('src/data/catalog.en.json')) {
            return 'vne-catalog-en';
          }
          if (id.includes('src/data/staticPages.json')) {
            return 'vne-static-pages';
          }
          return undefined;
        },
      },
    },
  },
});
