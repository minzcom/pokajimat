import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Guest public view
        main: resolve(__dirname, 'index.html'),
        // Admin protected view — lazy-loaded, separate bundle
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
