# 波形 wavex 产品官网

波形(wavex)是 Android 多 AI 服务商客户端,这是它的单页产品宣传官网:
Astro 构建的纯静态站点,push 到 main 即自动发布到 GitHub Pages。

线上地址:https://couldes.github.io/wavex-site/

## 产品功能

官网按四个分区展示 wavex 的核心能力:

- **服务商随心配** — 预置 OpenAI、Claude、DeepSeek、Kimi、通义千问、智谱 GLM,
  也支持任意 OpenAI / Anthropic 兼容接口,填上密钥即用,连接体检当场验错
- **对话体验** — 流式回复,Markdown 与数学公式完整渲染,智能降级链,历史一搜即达
- **用量统计** — 请求、成功率、Token 总览,趋势图表与逐条调用日志
- **隐私与安全** — API Key 只保存在本机,无账号、不追踪,自动备份一键恢复

完全免费开源(GPL-3.0):https://github.com/couldes/wavex

## 本地开发

```bash
npm install        # 首次
npm run dev        # 开发预览(访问 http://localhost:4321/wavex-site/)
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物(同样在 /wavex-site/ 子路径下)
```

## 部署

push 到 `main` → `.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages。
若仓库名或域名变化,同步修改 `astro.config.mjs` 的 `site` 与 `base` 即可
(页面内路径均由 BASE_URL 派生,无需另改)。
