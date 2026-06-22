// Floating-point precision edge tests: each case shows what native JS gets wrong and verifies the library computes correctly
// All cases are classic IEEE 754 double-precision pitfalls

import { describe, expect, it } from 'vitest'
import { add, addStr, calc, cmp, div, divStr, mulStr, rawDiv, subStr } from '../src'

describe('native JS floating-point loss — library must compute correctly', () => {
    it('0.1 + 0.2 (the classic)', () => {
        // native: 0.30000000000000004
        expect(0.1 + 0.2).not.toBe(0.3)
        expect(calc('0.1 + 0.2')).toBe('0.3')
        expect(addStr('0.1', '0.2')).toBe('0.3')
        expect(add(0.1, 0.2)).toBe(0.3) // number return value is also correct
    })

    it('0.1 + 0.7', () => {
        // native: 0.7999999999999999
        expect(0.1 + 0.7).not.toBe(0.8)
        expect(calc('0.1 + 0.7')).toBe('0.8')
        expect(addStr('0.1', '0.7')).toBe('0.8')
    })

    it('0.3 - 0.1', () => {
        // native: 0.19999999999999998
        expect(0.3 - 0.1).not.toBe(0.2)
        expect(calc('0.3 - 0.1')).toBe('0.2')
        expect(subStr('0.3', '0.1')).toBe('0.2')
    })

    it('1.4 - 0.1', () => {
        // native: 1.2999999999999998
        expect(1.4 - 0.1).not.toBe(1.3)
        expect(calc('1.4 - 0.1')).toBe('1.3')
    })

    it('0.1 + 0.2 + 0.3', () => {
        // native: 0.6000000000000001
        expect(0.1 + 0.2 + 0.3).not.toBe(0.6)
        expect(calc('0.1 + 0.2 + 0.3')).toBe('0.6')
    })

    it('1.1 + 2.2', () => {
        // native: 3.3000000000000003
        expect(1.1 + 2.2).not.toBe(3.3)
        expect(calc('1.1 + 2.2')).toBe('3.3')
    })

    it('0.1 + 0.2 - 0.3 should strictly equal 0', () => {
        // native: 5.551115123125783e-17
        expect(0.1 + 0.2 - 0.3).not.toBe(0)
        expect(calc('0.1 + 0.2 - 0.3')).toBe('0')
        expect(cmp(addStr('0.1', '0.2'), '0.3')).toBe(0)
    })

    it('1.1 - 1', () => {
        // native: 0.10000000000000009
        expect(1.1 - 1).not.toBe(0.1)
        expect(calc('1.1 - 1')).toBe('0.1')
    })

    it('3 - 2.9', () => {
        // native: 0.10000000000000009
        expect(3 - 2.9).not.toBe(0.1)
        expect(calc('3 - 2.9')).toBe('0.1')
    })
})

describe('multiplication precision loss', () => {
    it('0.1 * 0.2', () => {
        // native: 0.020000000000000004
        expect(0.1 * 0.2).not.toBe(0.02)
        expect(calc('0.1 * 0.2')).toBe('0.02')
        expect(mulStr('0.1', '0.2')).toBe('0.02')
    })

    it('0.07 * 100', () => {
        // native: 7.000000000000001
        expect(0.07 * 100).not.toBe(7)
        expect(calc('0.07 * 100')).toBe('7')
    })

    it('0.69 * 10', () => {
        // native: 6.8999999999999995
        expect(0.69 * 10).not.toBe(6.9)
        expect(calc('0.69 * 10')).toBe('6.9')
    })

    it('0.1 * 6', () => {
        // native: 0.6000000000000001
        expect(0.1 * 6).not.toBe(0.6)
        expect(calc('0.1 * 6')).toBe('0.6')
    })

    it('1.005 * 100 (classic toFixed pitfall)', () => {
        // native: 100.49999999999999 → Math.round(1.005 * 100)/100 = 1.00 (wrong! should be 1.01)
        expect(1.005 * 100).not.toBe(100.5)
        expect(calc('1.005 * 100')).toBe('100.5')
        // round to 2 decimal places — the case where toFixed always fails
        expect(calc('1.005', { _fmt: { decimals: 2, rounding: 'halfUp' } })).toBe('1.01')
    })

    it('9.99 * 10', () => {
        // native: 99.9 or 99.89999999999999 (may vary by implementation / JIT)
        // only assert that the library produces the exact value
        expect(calc('9.99 * 10')).toBe('99.9')
    })

    it('0.2 + 0.4 combined with multiplication', () => {
        // native: (0.2 + 0.4) * 3 = 1.7999999999999998
        expect((0.2 + 0.4) * 3).not.toBe(1.8)
        expect(calc('(0.2 + 0.4) * 3')).toBe('1.8')
    })
})

describe('division precision loss', () => {
    it('0.3 / 0.1', () => {
        // native: 2.9999999999999996
        expect(0.3 / 0.1).not.toBe(3)
        expect(calc('0.3 / 0.1')).toBe('3')
        expect(divStr('0.3', '0.1')).toBe('3')
    })

    it('0.6 / 0.2', () => {
        // native: 2.9999999999999996
        expect(0.6 / 0.2).not.toBe(3)
        expect(calc('0.6 / 0.2')).toBe('3')
    })

    it('0.7 / 0.1', () => {
        // native: 6.999999999999999
        expect(0.7 / 0.1).not.toBe(7)
        expect(calc('0.7 / 0.1')).toBe('7')
    })

    it('1 / 3 with many digits — must not truncate at the 17th digit like native', () => {
        // native: 0.3333333333333333 (17 digits)
        const native = String(1 / 3)
        expect(native.length).toBeLessThan(20)
        // our div defaults to 50-digit precision
        const ours = divStr('1', '3') as string
        expect(ours.startsWith('0.3333333333333333333333')).toBe(true)
        expect(ours.length).toBeGreaterThan(40)
    })

    it('precision truncation — 1/7 to 10 digits', () => {
        // 1/7 = 0.142857142857..., library default is ~5 (rounded), 10 digits should be 0.1428571429
        expect(div(1, 7)).toBeCloseTo(1 / 7) // verify number output is close to native
        expect((divStr('1', '7') as string).slice(0, 12)).toBe('0.1428571428')
    })
})

describe('large-number precision (Number.MAX_SAFE_INTEGER boundary)', () => {
    it('9007199254740993 — MAX_SAFE_INTEGER+2, native loses precision', () => {
        // native: '9007199254740993' is parsed as 9007199254740992 (off by 1) — round-tripping back to string reveals the error
        expect(Number('9007199254740993').toString()).not.toBe('9007199254740993')
        // string input => library preserves exactly
        expect(addStr('9007199254740993', '0')).toBe('9007199254740993')
        expect(addStr('9007199254740990', '4')).toBe('9007199254740994')
    })

    it('large integer addition', () => {
        // 99999999999999999 literal exceeds MAX_SAFE_INTEGER; native addition loses precision
        const native = (Number('99999999999999999') + 1).toString()
        expect(native).not.toBe('100000000000000001')
        // library computes exactly
        expect(addStr('99999999999999999', '1')).toBe('100000000000000000')
        expect(addStr('99999999999999999', '2')).toBe('100000000000000001')
    })

    it('large integer multiplication', () => {
        expect(mulStr('9999999999', '9999999999')).toBe('99999999980000000001')
    })

    it('astronomical number + small decimal', () => {
        // native: 1e20 + 1 → 100000000000000000000 (the 1 is lost)
        expect(1e20 + 1).toBe(100000000000000000000) // === proves precision loss
        expect(addStr('100000000000000000000', '1')).toBe('100000000000000000001')
    })
})

describe('scientific notation input handled correctly', () => {
    it('1e-10 + 2e-10', () => {
        // V8 can represent this magnitude exactly so native is also correct; just verify library string output
        expect(calc('1e-10 + 2e-10')).toBe('0.0000000003')
    })

    it('1e20 * 1e-20', () => {
        // native has rounding error
        expect(calc('1e20 * 1e-20')).toBe('1')
    })

    it('mixed scientific notation and plain numbers', () => {
        expect(addStr('1e-7', '0.0000001')).toBe('0.0000002')
    })
})

describe('chained accumulation (e-commerce amount summation)', () => {
    it('sum of ten 0.1 values (classic)', () => {
        const prices = Array.from<number>({ length: 10 }).fill(0.1)
        // native: 0.9999999999999999
        const native = prices.reduce((a, b) => a + b, 0)
        expect(native).not.toBe(1)

        // library: exact result "1"
        const ours = prices.reduce((a, b) => addStr(String(a), String(b)) as string, '0')
        expect(ours).toBe('1')
    })

    it('cart amount × quantity / discount / tax rate (default truncation)', () => {
        // 9.99 × 3 × 1.07 × 0.85 = 27.2577150…
        // default decimals=2 truncates ⇒ "27.25"
        const total = calc('9.99 * 3 * (1 + 0.07) * 0.85', { _fmt: { decimals: 2 } })
        expect(total).toBe('27.25')
        // half-up rounding ⇒ "27.26"
        const totalRounded = calc('9.99 * 3 * (1 + 0.07) * 0.85', { _fmt: { decimals: 2, rounding: 'halfUp' } })
        expect(totalRounded).toBe('27.26')
    })

    it('split bill: 100 divided among 3 people', () => {
        // 100 / 3 = 33.333..., native only keeps 16 significant digits
        expect((100 / 3).toString()).toBe('33.333333333333336') // trailing 6 is the error

        // library: rawDiv truncates to 2 decimal places ⇒ "33.33"
        const share = rawDiv('100', '3', 2)
        expect(share).toBe('33.33')
        // remainder goes to the last person ⇒ 33.34
        const remainder = subStr('100', mulStr(share, '2'))
        expect(remainder).toBe('33.34')
        expect(addStr(share, share, remainder)).toBe('100')
    })
})

describe('native Number-to-string pitfalls', () => {
    it('number-to-string already loses precision; string input preserves it', () => {
        // 1.005 is stored in IEEE 754 as 1.00499999...
        // but passing string '1.005' in, the library should treat it as exactly 1.005
        expect(calc('1.005 + 0', { _fmt: { decimals: 5 } })).toBe('1.00500')
        // note: passing number 1.005 directly, the library can only get String(1.005) === '1.005', which happens to be fine
        // verify via *100 + rounding scenario
        expect(calc('1.005', { _fmt: { decimals: 2, rounding: 'halfUp' } })).toBe('1.01')
    })

    it('native toFixed bug: 1.005.toFixed(2) === "1.00"; library halfUp gives 1.01', () => {
        expect((1.005).toFixed(2)).toBe('1.00') // native toFixed bug
        expect(calc('1.005', { _fmt: { decimals: 2, rounding: 'halfUp' } })).toBe('1.01')
    })

    it('toFixed another case: 2.55.toFixed(1)', () => {
        // native 2.55.toFixed(1) === "2.5" (should be "2.6")
        expect((2.55).toFixed(1)).toBe('2.5')
        expect(calc('2.55', { _fmt: { decimals: 1, rounding: 'halfUp' } })).toBe('2.6')
    })

    it('toFixed carry error: 0.1 + 0.2', () => {
        expect((0.1 + 0.2).toFixed(20)).toBe('0.30000000000000004441')
        expect(calc('0.1 + 0.2', { _fmt: { decimals: 20 } })).toBe('0.30000000000000000000')
    })
})
