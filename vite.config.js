import { defineConfig } from 'vite';
export default defineConfig({
  root: 'src',
  base: '/tn-elections-2026/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  publicDir: '../public',
});
