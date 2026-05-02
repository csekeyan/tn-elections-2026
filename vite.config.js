import { defineConfig } from 'vite';
export default defineConfig({
  root: 'src',
  base: process.env.CF_PAGES ? '/' : '/tn-elections-2026/',
  plugins: [],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  publicDir: '../public',
});
