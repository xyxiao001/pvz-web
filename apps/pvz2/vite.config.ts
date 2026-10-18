import { defineConfig } from 'vite';
import { pvz2Pwa } from './tools/build-pwa';

export default defineConfig({
  base: '/pvz2/',
  plugins: [pvz2Pwa()],
  server: { port: 5174, strictPort: true },
  build: { target: 'es2022' },
});
