import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  server: {
    port: 5180,
  },
  preview: {
    port: 5180,
  },
  plugins: [
    federation({
      name: 'tla_repro_host',
      remotes: {},
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom/client': { singleton: true, requiredVersion: '^19.0.0' },
        '@tanstack/react-query': { singleton: true, requiredVersion: '^5.0.0' },
        'react-router': { singleton: true, requiredVersion: '^7.0.0' },
        'lucide-react': { singleton: true, requiredVersion: '^0.500.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
      },
      dts: false,
    }),
    react(),
  ],
  build: {
    target: 'esnext',
  },
});
