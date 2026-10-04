// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://couldes.github.io',
  markdown: {
    shikiConfig: { theme: 'min-light' },
  },
});
