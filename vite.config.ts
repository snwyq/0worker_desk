import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export function getViteConfig() {
  return defineConfig({
    plugins: [
      react(),
    ],
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    build: {
      outDir: 'dist',
    },
  });
}

export default getViteConfig();
