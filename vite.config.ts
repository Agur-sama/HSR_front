import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Воркер MapLibre — модуль: в формате iife сборщик не может разложить его
  // зависимости, и сборка падает на подключении фонового потока карты.
  worker: { format: 'es' }
});
