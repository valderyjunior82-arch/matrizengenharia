import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // O cliente do Supabase sozinho passa de 500 kB; o app inteiro dá ~150 kB comprimido,
  // aceitável para um app de obra. Se passar de 700 kB, aí sim vale dividir.
  build: { chunkSizeWarningLimit: 700 },
})
