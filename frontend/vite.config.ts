import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Configuration Vite standard pour React + Tailwind
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true,
  },
})
