import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pvz2/',
  server: { port: 5174, strictPort: true },
  build: { target: 'es2022' },
});
