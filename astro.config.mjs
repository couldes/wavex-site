// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// GitHub 项目页部署:仓库 couldes/wavex-site → https://couldes.github.io/wavex-site/
// 若仓库名或域名变化,同步修改 site 与 base(模板内路径均基于 BASE_URL 派生)。
export default defineConfig({
  site: 'https://couldes.github.io',
  base: '/wavex-site',
  markdown: {
    shikiConfig: { theme: 'min-light' },
  },
});
