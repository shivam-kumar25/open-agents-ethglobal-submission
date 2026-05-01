import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/axl-planner': { target: 'http://127.0.0.1:9002', rewrite: (p) => p.replace('/axl-planner', '') },
      '/axl-researcher': { target: 'http://127.0.0.1:9012', rewrite: (p) => p.replace('/axl-researcher', '') },
      '/axl-executor': { target: 'http://127.0.0.1:9022', rewrite: (p) => p.replace('/axl-executor', '') },
      '/axl-evaluator': { target: 'http://127.0.0.1:9032', rewrite: (p) => p.replace('/axl-evaluator', '') },
      '/axl-evolution': { target: 'http://127.0.0.1:9042', rewrite: (p) => p.replace('/axl-evolution', '') },
    },
  },
})
