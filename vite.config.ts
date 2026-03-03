import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pedal-architect/',
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const names = [assetInfo.name, ...(assetInfo.names ?? [])].filter((name): name is string => Boolean(name))
          if (names.some((name) => name.endsWith('WDFProcessor.ts'))) {
            return 'assets/[name]-[hash].js'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
