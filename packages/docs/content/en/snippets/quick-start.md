---
navigation: false
---

```ts twoslash [quick-start.ts]
import { addStr, calc, calcAvg, calcSum, chainAdd, div, divStr, fmt, setConfig } from '@wzo/calc'

// Global config: call once at app entry — shared across the entire application (fmt fallback / division precision)
// setConfig({ _error: 0, _precision: 20 })

// Precision arithmetic (no floating-point errors)
calc('(0.1 + 0.2) * 3') // "0.9"

// Variables are interpolated into the expression as literals
const { price, qty } = { price: 9.9, qty: 3 }
calc(`${price} * ${qty}`, { _fmt: { decimals: 2 } }) // "29.70"

// Type-friendly formatting
fmt(1234567, { decimals: 2, thousands: true }) // "1,234,567.00"
fmt(1234567, { compact: 'zh', decimals: 2 }) // "123.45万"
// Display fmt: supports expressions + error fallback (dirty data won't crash the page)
fmt(`${price} * ${qty}`, { decimals: 2 }) // "29.70"
fmt('bad expr', { _error: '-' }) // "-"

// High-precision strings: no precision loss for amounts or large integers
addStr('0.1', '0.2') // "0.3"
addStr('9007199254740993', '1') // "9007199254740994"

// Chaining
chainAdd(10).sub(3).mul(2)() // "14"

// Aggregation (automatically skips null / undefined)
calcSum('price', [{ price: 10 }, { price: 20 }]) // "30"

// Division precision: uses global _precision by default; override per call at the end (does not pollute global state)
div(100, 3, { _precision: 2 }) // 33.33
```
