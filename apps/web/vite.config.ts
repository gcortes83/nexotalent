/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      // En local, /v1 se reenvía a la API (evita CORS). En Docker lo hace nginx; en AWS, CloudFront → ALB.
      proxy: { '/v1': apiTarget, '/health': apiTarget },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      css: false,
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/main.tsx', 'src/test/**'] },
    },
  };
});
