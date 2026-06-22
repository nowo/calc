---
navigation: false
---

```ts twoslash [quick-start.ts]
import { addStr, calc, calcAvg, calcSum, chainAdd, div, divStr, fmt, setConfig } from '@wzo/calc'

// 全局配置：入口处最早执行一次，整个应用共用（fmt 兜底值 / 除法精度）
// setConfig({ _error: 0, _precision: 20 })

// 精度算术（无浮点误差）
calc('(0.1 + 0.2) * 3') // "0.9"

// 变量用模板插值写进表达式
const { price, qty } = { price: 9.9, qty: 3 }
calc(`${price} * ${qty}`, { _fmt: { decimals: 2 } }) // "29.70"

// 类型友好的格式化
fmt(1234567, { decimals: 2, thousands: true }) // "1,234,567.00"
fmt(1234567, { compact: 'zh', decimals: 2 }) // "123.45万"
// 展示用 fmt：支持运算 + 出错兜底（脏数据不会让页面崩）
fmt(`${price} * ${qty}`, { decimals: 2 }) // "29.70"
fmt('bad expr', { _error: '-' }) // "-"

// 高精度字符串：金额 / 大整数不丢精度
addStr('0.1', '0.2') // "0.3"
addStr('9007199254740993', '1') // "9007199254740994"

// 链式
chainAdd(10).sub(3).mul(2)() // "14"

// 聚合（自动跳过 null / undefined）
calcSum('price', [{ price: 10 }, { price: 20 }]) // "30"

// 除法精度：默认走全局 _precision，可在末尾单次覆盖（不污染全局）
div(100, 3, { _precision: 2 }) // 33.33
```
