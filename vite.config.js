import { defineConfig } from 'vite';
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
export default defineConfig({
  root: 'src',
  base: isGitHubPages ? '/tn-elections-2026/' : '/',
  plugins: [],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  publicDir: '../public',
});
