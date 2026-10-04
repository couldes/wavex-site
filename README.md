# 波形 wavex 产品官网

wavex(波形)—— Android 多 AI 服务商客户端的**单页产品宣传官网**。Astro 构建的纯静态站点,push 即发布到 GitHub Pages。

## 修改内容

- **产品数据**(名称/版本/一句话/链接/截图路径/分区文案):`src/data/site.ts` —— 发新版本或改文案只动这一处
- **页面结构**:`src/pages/index.astro`(单页组装)
- **组件**:`src/components/`(SiteNav 吸顶导航、Hero 深色首屏、FeatureSection 功能分区、PhoneFrame 手机框、FeatureCard 图标卡、OpenSource、SiteFooter)
- **样式与动效**:`src/styles/global.css`(设计变量、按钮、滚动进入动效、reduced-motion 守卫)
- **截图与图标**:`public/screens/*.png`、`public/icon.svg`(源文件在 wavex 仓库 `docs/` 与 `.github/assets/`)

## 本地开发

```bash
npm install        # 首次
npm run dev        # 开发预览(默认 http://localhost:4321)
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
```

## 部署

push 到 `main` → `.github/workflows/deploy.yml` 自动构建并发布 GitHub Pages。
若 Pages 域名变化,改 `astro.config.mjs` 的 `site`。

## 约束

- 纯静态:无后端、无账号;内容为中文
- 动效只用 transform/opacity,全站尊重系统"减少动态效果"设置
- 不引入动画库与额外运行时依赖(dependencies 仅 astro)

详细设计:`docs/superpowers/specs/2026-10-04-wavex-landing-design.md`
