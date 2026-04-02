import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        mesa:      resolve(__dirname, 'mesa.html'),
        cocina:    resolve(__dirname, 'cocina.html'),
        caja:      resolve(__dirname, 'caja.html'),
        domicilio: resolve(__dirname, 'domicilio.html'),
        admin:     resolve(__dirname, 'admin.html'),
      }
    }
  }
})
