import { defineConfig } from 'vite';
import { runtimePublicAssets } from './tools/build-public-assets';
import { pwa } from './tools/build-pwa';

export default defineConfig({
  base: './',
  plugins: [runtimePublicAssets(), pwa()],
  server: { port: 5173, strictPort: true, proxy: { '/pvz2': { target: 'http://127.0.0.1:5174', ws: true } } },
  preview: { proxy: {} },
  build: { target: 'es2022', copyPublicDir: false },
});
