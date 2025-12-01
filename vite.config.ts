import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose custom environment variables to the client
  envPrefix: ['VITE_', 'SUPABASE_', 'PUSHIABLE_'],
})
