<p align="center">
  <img src="./logo.svg" width="88" height="88" alt="@wzo/calc" />
</p>

<h1 align="center">@wzo/calc</h1>

<p align="center">
  Precision math + number formatting — zero runtime dependencies, BigInt all the way down
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@wzo/calc"><img src="https://img.shields.io/npm/v/@wzo/calc?color=cb3837&logo=npm&logoColor=white" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/dependencies-0-44CC11" alt="zero dependencies" />
  <img src="https://img.shields.io/badge/target-ES2022-F7DF1E?logo=javascript&logoColor=black" alt="ES2022" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
</p>

<p align="center"><b>English</b> | <a href="./README.zh.md">简体中文</a></p>

JavaScript's native floating-point gets it wrong (`0.1 + 0.2 === 0.30000000000000004`). `@wzo/calc` uses BigInt for strict decimal rational arithmetic, and provides type-friendly number formatting.

## ✨ Features

- 🎯 **Precision arithmetic** — represented internally as `digits × 10^(-exp)`; every rational operation is exactly correct
- 🧮 **Expression evaluation** — `calc('1 + 2 * 3')`: pure arithmetic + math functions (`abs`/`min`/`max`/`sqrt`/`pow`/`mod`/`clamp`…); use template interpolation for variables
- 🪢 **Computation / display separation** — `calc` throws on error (for computation); `fmt` is the display variant of calc — supports arithmetic and falls back to `_error` on failure (for template rendering)
- 🎨 **Type-friendly formatting** — thousands separators, percent, compact, fraction, scientific, 6 rounding modes — all configured via an `IFormat` object (IDE completion, mistakes caught at write time)
- 🔗 **Chaining / standalone functions / aggregation** and more API styles
- 📦 **Zero runtime dependencies**, runs in the browser and Node, complete TypeScript types

## 📦 Install

```bash
pnpm add @wzo/calc
```

## 🚀 Quick start

```ts
import { calc, calcSum, chainAdd, fmt } from '@wzo/calc'

// Precision arithmetic
calc('0.1 + 0.2') // "0.3"

// Template interpolation instead of variables + formatting (IFormat object)
calc('9.9 * 3', { _fmt: { decimals: 2 } }) // "29.70"

// Direct formatting
fmt(1234567, { decimals: 2, thousands: true }) // "1,234,567.00"
fmt(1234567, { compact: 'zh' }) // "123.4567万"

// Chaining
chainAdd(10).sub(3).mul(2)() // "14"

// Aggregation
calcSum('price', [{ price: 10 }, { price: 20 }]) // "30"
```

## 🧮 Expression power

```ts
calc('(1 + 2) * 3') // four operations + parentheses
calc('max(3, 5) * 2') // math functions
calc(`${price} * 1.07`) // use template interpolation for variables
```

Built-in math functions: `abs` `sign` `floor` `ceil` `round` `trunc` `sqrt` `pow` `mod` `min` `max` `clamp` (all exact except `sqrt` / negative `pow`, which round to the division precision).

> Expressions are pure arithmetic — no variables / conditionals / comparisons / logic. **Use template interpolation for variables, and write conditionals outside in JS**: `a > 100 ? calc(\`${a} * 0.9\`) : String(a)`.

## 🎨 Formatting (`IFormat` object)

| Field | Description |
| :--- | :--- |
| `decimals` | Decimal places: `number` fixed, `{ min, max }` range |
| `rounding` | `'truncate'` (default) / `'halfUp'` / `'banker'` / `'ceil'` (→+∞) / `'floor'` (→−∞) / `'expand'` (away from zero) — with JS aliases `trunc`/`round`/`halfEven` |
| `thousands` | `true` US-style / `'eu'` / `'in'` |
| `compact` | `true` K/M/B/T / `'zh'` (万/亿) |
| `clamp` | `[min, max]` value range limit |
| `output` | `'percent'` / `'fraction'` / `'scientific'` / `'number'` (or symbols `%%` `//` `e` `num`) |
| `plus` | Show the plus sign |
| `pad` | Zero-pad the integer part to N digits |

## 🧰 Main API

| API | Purpose |
| :--- | :--- |
| `calc(expr, options?)` | Expression evaluation + optional formatting (throws on error) |
| `fmt(value, options?)` | Display variant of calc: supports arithmetic + formatting (falls back on error) |
| `chainAdd/chainSub/chainMul/chainDiv` | Chained operations |
| `add/sub/mul/div/sqrt/pow/mod` (→ number), `addStr/…/sqrtStr/powStr/modStr` (→ string) | Standalone operations |
| `calcSum/calcAvg/calcMedian/calcMax/calcMin` | Array / object-array aggregation |
| `setConfig/resetConfig/getConfig` | Global config (error fallback, default format, precision) |

> `div` / `divStr` / `chainDiv` / `calcAvg` accept a trailing `{ _precision }` to set the division precision for that call only, without polluting the global config.

See the [full documentation](https://nowo.github.io/calc) for details.

## 🌐 Runtime

The build output targets **ES2022** and uses **BigInt** and `Array.prototype.at` internally, so the runtime must satisfy:

| Environment | Minimum version |
| :--- | :--- |
| Chrome / Edge | 92 |
| Firefox | 90 |
| Safari (macOS / iOS) | 15.4 |
| Node.js | 16.6 |

That covers all major browsers from March 2022 onward. BigInt is the hard lower bound — it cannot be polyfilled.

## 📄 License

[MIT](./LICENSE) © nowo
