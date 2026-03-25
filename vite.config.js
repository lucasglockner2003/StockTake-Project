import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function createProxyTarget(envValue, fallbackValue) {
  const normalizedValue = String(envValue || '').trim()

  if (normalizedValue) {
    return normalizedValue
  }

  return fallbackValue
}

function createRewriteProxy(target, prefix) {
  return {
    target,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(new RegExp(`^${prefix}`), ''),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = createProxyTarget(
    env.VITE_DEV_API_PROXY_TARGET,
    'http://localhost:3000'
  )
  const photoOcrProxyTarget = createProxyTarget(
    env.VITE_DEV_PHOTO_OCR_PROXY_TARGET,
    'http://localhost:3001'
  )
  const botServiceProxyTarget = createProxyTarget(
    env.VITE_DEV_BOT_SERVICE_PROXY_TARGET,
    'http://localhost:4190'
  )
  const mockPortalProxyTarget = createProxyTarget(
    env.VITE_DEV_MOCK_PORTAL_PROXY_TARGET,
    'http://localhost:4177'
  )

  return {
    plugins: [react()],
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/photo-ocr': createRewriteProxy(photoOcrProxyTarget, '/photo-ocr'),
        '/bot-service': createRewriteProxy(botServiceProxyTarget, '/bot-service'),
        '/mock-portal': createRewriteProxy(mockPortalProxyTarget, '/mock-portal'),
      },
    },
  }
})
