// @ts-check
import { defineConfig } from 'astro/config'

import icon from 'astro-icon'
import alpinejs from '@astrojs/alpinejs'

export default defineConfig({
  output: 'server',
  integrations: [icon(), alpinejs()],
  devToolbar: { enabled: false }
})
