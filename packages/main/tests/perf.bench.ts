import { bench, describe } from 'vitest'
import { add, addStr, calc, chainAdd, div, fmt, mul } from '../src'

// Run: pnpm --filter @wzo/calc bench

describe('precision arithmetic', () => {
    bench('add(0.1, 0.2) → number', () => {
        add(0.1, 0.2)
    })
    bench('addStr("0.1", "0.2") → string', () => {
        addStr('0.1', '0.2')
    })
    bench('mul("1.1", "2.2")', () => {
        mul('1.1', '2.2')
    })
    bench('div("1", "3") (50 digits)', () => {
        div('1', '3')
    })
})

describe('expression evaluation', () => {
    bench('calc("1 + 2 * 2")', () => {
        calc('1 + 2 * 2')
    })
    bench('calc with math functions max/clamp', () => {
        calc('clamp(max(3, 5) * 2, 0, 100)')
    })
    bench('calc with formatting (_fmt)', () => {
        calc('9.9 * 3', { _fmt: { decimals: 2 } })
    })
})

describe('formatting / chaining', () => {
    bench('fmt(1234567, { decimals: 2, thousands: true })', () => {
        fmt(1234567, { decimals: 2, thousands: true })
    })
    bench('fmt(1234567, { compact: "zh" })', () => {
        fmt(1234567, { compact: 'zh' })
    })
    bench('chainAdd(10).sub(3).mul(2)()', () => {
        chainAdd(10).sub(3).mul(2)()
    })
})

describe('baseline: native JS (fast but loses precision)', () => {
    bench('native 0.1 + 0.2 (= 0.30000000000000004)', () => {
        Number(0.1 + 0.2)
    })
})
