import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext']
  },
  build: {
    rollupOptions: {
      external: [
        'better-sqlite3',
        'node-machine-id',
        'electron'
      ]
    }
  }
});
