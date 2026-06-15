import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5600, // Fixa a porta 5600 para quando você estiver testando localmente sem Docker
    strictPort: true, // Se a porta 5600 estiver ocupada, o Vite dá erro em vez de pular para outra aleatória
  },
  preview: {
    port: 5600,
  }
});