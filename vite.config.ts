import { defineConfig } from 'vite';
import { runtimePublicAssets } from './tools/build-public-assets';
import { pwa } from './tools/build-pwa';

export default defineConfig({
  base: './',
  plugins: [runtimePublicAssets(), pwa()],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', copyPublicDir: false },
});
