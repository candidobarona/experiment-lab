/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/. Update this if
  // you rename the repository, or set it to '/' for a custom domain / a
  // user/organization "<user>.github.io" repo.
  base: '/experiment-lab/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts')) return 'recharts'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
