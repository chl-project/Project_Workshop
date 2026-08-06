import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Stamps the running build into the bundle. Without it there is no way to tell
 * a deployment that predates a fix from a fix that didn't work — the sidebar
 * shows this next to the price basis, and `/api/health` reports the same value.
 */
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT__: JSON.stringify(commit),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
