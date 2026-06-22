<p align="center">
  <img src="./packages/main/logo.svg" width="88" height="88" alt="calc" />
</p>

<h1 align="center">calc</h1>

<p align="center"><a href="./README.md">English</a> | <b>简体中文</b></p>

> 精度数学 + 数字格式化库的 monorepo —— 用 BigInt 修复 JS 浮点误差，提供类型友好的格式化。

```ts
import { calc, fmt } from '@wzo/calc'

calc('0.1 + 0.2') // "0.3"  （而非 0.30000000000000004）
fmt(1234567, { decimals: 2, thousands: true }) // "1,234,567.00"
```

## 仓库结构

| 包 | 说明 |
| :--- | :--- |
| [`packages/main`](./packages/main)（`@wzo/calc`）| 核心库：0 运行时依赖，全程 BigInt |
| [`packages/docs`](./packages/docs) | 文档站（Nuxt Content + Nuxt UI，代码块带 Twoslash 悬停类型）|

核心库的特性、API、用法见 [`packages/main/README.zh.md`](./packages/main/README.zh.md)；完整文档见 [nowo.github.io/calc](https://nowo.github.io/calc)。

## 本地开发

```bash
pnpm install          # 安装依赖
pnpm test             # 跑单测
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查
pnpm build            # 构建核心库
pnpm docs:dev         # 启动文档站（localhost:3000）
```

> 改了 `packages/main` 的源码后，文档站要用上新代码需先 `pnpm build`（文档走的是 `dist`）。

## 技术栈

- **构建**：[tsdown](https://tsdown.dev)（基于 Rolldown）
- **测试**：[Vitest](https://vitest.dev)
- **代码规范**：[@antfu/eslint-config](https://github.com/antfu/eslint-config)
- **文档**：[Nuxt Content](https://content.nuxt.com) + [Nuxt UI](https://ui.nuxt.com) + [Twoslash](https://twoslash.netlify.app)
- **包管理**：pnpm workspace

## License

MIT
