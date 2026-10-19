import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, run `netlify dev` from the project root so /api requests
// are served by the Netlify Function alongside the Vite dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
