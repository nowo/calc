<p align="center">
  <img src="./logo.svg" width="88" height="88" alt="@wzo/calc" />
</p>

<h1 align="center">@wzo/calc</h1>

<p align="center">
  精度数学 + 数字格式化库 —— 0 运行时依赖，内部全程 BigInt
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@wzo/calc"><img src="https://img.shields.io/npm/v/@wzo/calc?color=cb3837&logo=npm&logoColor=white" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/dependencies-0-44CC11" alt="zero dependencies" />
  <img src="https://img.shields.io/badge/target-ES2022-F7DF1E?logo=javascript&logoColor=black" alt="ES2022" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
</p>

<p align="center"><a href="./README.md">English</a> | <b>简体中文</b></p>

JavaScript 原生浮点会算错（`0.1 + 0.2 === 0.30000000000000004`）。`@wzo/calc` 用 BigInt 做严格的十进制有理运算，并提供类型友好的数字格式化。

## ✨ 特性

- 🎯 **精度算术** —— 内部以 `digits × 10^(-exp)` 表示，所有有理运算严格正确
- 🧮 **表达式求值** —— `calc('1 + 2 * 3')`，纯算术 + 数学函数（`abs`/`min`/`max`/`pow`/`mod`/`clamp`…），变量用模板插值
- 🪢 **计算 / 展示分离** —— `calc` 出错抛异常（计算用）；`fmt` 是 calc 的展示版，支持运算且出错走 `_error` 兜底（模板渲染用）
- 🎨 **类型友好的格式化** —— 千分位、百分比、压缩、分数、科学记数、4 种舍入，全用 `IFormat` 对象配置（IDE 补全、写错即报错）
- 🔗 **链式 / 独立函数 / 聚合** 等多种 API 风格
- 📦 **0 运行时依赖**，浏览器 / Node 都能跑，完整 TypeScript 类型

## 📦 安装

```bash
pnpm add @wzo/calc
```

## 🚀 快速上手

```ts
import { calc, calcSum, chainAdd, fmt } from '@wzo/calc'

// 精度算术
calc('0.1 + 0.2') // "0.3"

// 模板插值代替变量 + 格式化（IFormat 对象）
calc('9.9 * 3', { _fmt: { decimals: 2 } }) // "29.70"

// 直接格式化
fmt(1234567, { decimals: 2, thousands: true }) // "1,234,567.00"
fmt(1234567, { compact: 'zh' }) // "123.4567万"

// 链式
chainAdd(10).sub(3).mul(2)() // "14"

// 聚合
calcSum('price', [{ price: 10 }, { price: 20 }]) // "30"
```

## 🧮 表达式能力

```ts
calc('(1 + 2) * 3') // 四则运算 + 括号
calc('max(3, 5) * 2') // 数学函数
calc(`${price} * 1.07`) // 变量用模板插值写进表达式
```

内置数学函数（精确）：`abs` `sign` `floor` `ceil` `round` `trunc` `pow` `mod` `min` `max` `clamp`。

> 表达式是纯算术，不含变量 / 条件 / 比较 / 逻辑——**变量用模板插值、条件判断在 JS 外层写**：`a > 100 ? calc(\`${a} * 0.9\`) : String(a)`。

## 🎨 格式化（`IFormat` 对象）

| 字段 | 说明 |
| :--- | :--- |
| `decimals` | 小数位：`number` 固定、`{ min, max }` 区间 |
| `rounding` | `'truncate'`(默认) / `'halfUp'` / `'banker'` / `'ceil'`（含 JS 别名 `trunc`/`round`/`halfEven`）|
| `thousands` | `true` 美式 / `'eu'` / `'in'` |
| `compact` | `true` K/M/B/T / `'zh'`（万/亿）|
| `clamp` | `[min, max]` 值范围限制 |
| `output` | `'percent'` / `'fraction'` / `'scientific'` / `'number'`（或符号 `%%` `//` `e` `num`）|
| `plus` | 显示正号 |
| `pad` | 整数补零到 N 位 |

## 🧰 主要 API

| API | 作用 |
| :--- | :--- |
| `calc(expr, options?)` | 表达式求值 + 可选格式化（出错抛） |
| `fmt(value, options?)` | calc 的展示版：支持运算 + 格式化（出错兜底） |
| `chainAdd/chainSub/chainMul/chainDiv` | 链式运算 |
| `add/sub/mul/div`（→ number）、`addStr/subStr/mulStr/divStr`（→ string） | 独立运算 |
| `calcSum/calcAvg/calcMax/calcMin` | 数组 / 对象数组聚合 |
| `setConfig/resetConfig/getConfig` | 全局配置（错误兜底、默认格式、精度）|

> `div` / `divStr` / `chainDiv` / `calcAvg` 末尾可传 `{ _precision }` 单次指定除法精度，不污染全局。

更多细节见 [完整文档](https://nowo.github.io/calc)。

## 🌐 运行环境

构建产物语法层级为 **ES2022**，内部使用 **BigInt** 与 `Array.prototype.at`，运行环境需满足：

| 环境 | 最低版本 |
| :--- | :--- |
| Chrome / Edge | 92 |
| Firefox | 90 |
| Safari（macOS / iOS）| 15.4 |
| Node.js | 16.6 |

即覆盖 2022 年 3 月起的主流浏览器。其中 BigInt 是无法 polyfill 的硬性下限。

## 📄 License

[MIT](./LICENSE) © nowo
