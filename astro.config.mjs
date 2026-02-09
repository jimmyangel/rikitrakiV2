// @ts-check
import { defineConfig } from 'astro/config'

import icon from 'astro-icon'
import alpinejs from '@astrojs/alpinejs'

export default defineConfig({
  output: 'static',
  integrations: [icon(), alpinejs()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [
      {
        name: 'spa-fallback',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url

            // Ignore Vite internals
            if (
              url.startsWith('/@vite') ||
              url.startsWith('/@id') ||
              url.startsWith('/node_modules') ||
              url.startsWith('/__vite') ||
              url.startsWith('/@fs')
            ) {
              return next()
            }

            // Ignore Astro virtual modules
            if (url.includes('?astro')) {
              return next()
            }

            // Ignore source files
            if (url.startsWith('/src/')) {
              return next()
            }

            // Ignore Cesium assets
            if (url.startsWith('/Cesium/')) {
              return next()
            }

            // Only look at the PATH for dots, not the query
            const path = url.split('?')[0] // e.g. "/jimmyangel"
            if (path.includes('.')) {
              return next() // real file like "/assets/app.js", "/image.png"
            }

            // Everything else is SPA → serve index.html
            console.log('[SPA-FALLBACK]', url)
            req.url = '/index.html'
            return next()
          })
        }
      }
    ]
  }
})
