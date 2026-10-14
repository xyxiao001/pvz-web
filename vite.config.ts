import { defineConfig } from 'vite';
import { pwa } from './tools/build-pwa';

export default defineConfig({
  base: './',
  plugins: [pwa()],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022' },
});
