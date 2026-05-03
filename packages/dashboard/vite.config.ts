import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/planner-api': { target: 'http://127.0.0.1:9003', rewrite: (p) => p.replace('/planner-api', '') },
      '/axl-planner': { target: 'http://127.0.0.1:9003', rewrite: (p) => p.replace('/axl-planner', '') },
      '/axl-researcher': { target: 'http://127.0.0.1:9016', rewrite: (p) => p.replace('/axl-researcher', '') },
      '/axl-executor': { target: 'http://127.0.0.1:9023', rewrite: (p) => p.replace('/axl-executor', '') },
      '/axl-evaluator': { target: 'http://127.0.0.1:9033', rewrite: (p) => p.replace('/axl-evaluator', '') },
      '/axl-evolution': { target: 'http://127.0.0.1:9043', rewrite: (p) => p.replace('/axl-evolution', '') },
    },
  },
})
