import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base + hash routing lets the build run from any path, e.g. github.io/onchainstocks/
export default defineConfig({
  base: './',
  plugins: [react()],
})
