import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mesa: resolve(__dirname, 'mesa.html'),
        cocina: resolve(__dirname, 'cocina.html'),
        caja: resolve(__dirname, 'caja.html'),
        domicilio: resolve(__dirname, 'domicilio.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  }
})
