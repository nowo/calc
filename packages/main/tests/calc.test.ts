import { describe, expect, it } from 'vitest'
import { add, addStr, calc, calcAvg, calcMax, calcMin, calcSum, chainAdd, chainDiv, chainMul, chainSub, div, divStr, fmt, getConfig, mul, resetConfig, setConfig, sub } from '../src'

describe('calc — expression evaluation (from README)', () => {
    it('precision arithmetic', () => {
        expect(calc('0.1 + 0.2')).toBe('0.3')
        expect(calc('0.1 + 0.2 * 0.3 / 0.4 * (0.5 + 0.6)')).toBe('0.265')
    })

    it('template interpolation instead of variables', () => {
        const a = 1
        const b = 2
        expect(calc(`${a} + ${b}`)).toBe('3')
        const price = 9.9
        const qty = 3
        expect(calc(`${price} * ${qty}`, { _fmt: { decimals: 2 } })).toBe('29.70')
    })

    it('formatting (_fmt object)', () => {
        expect(calc('1234567', { _fmt: { thousands: true } })).toBe('1,234,567')
        expect(calc('1234567', { _fmt: { decimals: 2, thousands: true } })).toBe('1,234,567.00')
    })

    it('unit (percent sign)', () => {
        expect(calc('0.1% + 0.2%', { _unit: true })).toBe('0.3%')
    })

    it('error: calc throws (see fmt for fallback)', () => {
        expect(() => calc('1 + ')).toThrow() // invalid expression
        expect(() => calc('foo(1)')).toThrow() // unknown function
    })
})

describe('fmt — direct formatting', () => {
    it('thousands separator', () => {
        expect(fmt(1234567, { thousands: true })).toBe('1,234,567')
        expect(fmt(1234567, { decimals: 2, thousands: true })).toBe('1,234,567.00')
    })

    it('fixed decimal places / min-max bounds', () => {
        expect(fmt(0.1234, { decimals: 2 })).toBe('0.12')
        expect(fmt(1.1, { decimals: { max: 2 } })).toBe('1.1') // no zero-padding
        expect(fmt(1, { decimals: { min: 2 } })).toBe('1.00') // pad to 2 places
    })

    it('explicit plus sign', () => {
        expect(fmt(1, { plus: true })).toBe('+1')
        expect(fmt(-1, { plus: true })).toBe('-1')
        expect(fmt(0, { plus: true })).toBe('0')
    })

    it('percent output', () => {
        expect(fmt(0.5, { output: 'percent' })).toBe('50%')
        expect(fmt(0.1234, { decimals: 1, output: 'percent' })).toBe('12.3%')
    })

    it('scientific notation output', () => {
        expect(fmt(1000, { output: 'scientific' })).toBe('1e+3')
        expect(fmt(0.0001, { output: 'scientific' })).toBe('1e-4')
    })

    it('number output', () => {
        expect(fmt(0.1234, { decimals: 2, output: 'number' })).toBe(0.12)
    })

    it('compact notation (default K/M/B/T)', () => {
        expect(fmt(1234567, { decimals: 2, compact: true })).toBe('1.23M')
        expect(fmt(1234, { decimals: 2, compact: true })).toBe('1.23K')
        expect(fmt(1234567890, { decimals: 2, compact: true })).toBe('1.23B')
    })

    it('compact preset zh', () => {
        expect(fmt(1234567, { decimals: 2, compact: 'zh' })).toBe('123.45万')
    })

    it('european thousands separator', () => {
        expect(fmt(1234.5, { decimals: 2, thousands: 'eu' })).toBe('1.234,50')
    })

    it('indian thousands separator', () => {
        expect(fmt(123456, { thousands: 'in' })).toBe('1,23,456')
    })

    it('integer zero-padding (pad)', () => {
        expect(fmt(5, { pad: 3 })).toBe('005')
        expect(fmt(123, { pad: 3 })).toBe('123')
    })

    it('rounding strategies', () => {
        expect(fmt(1.235, { decimals: 2 })).toBe('1.23') // default truncation
        expect(fmt(1.235, { decimals: 2, rounding: 'halfUp' })).toBe('1.24')
        expect(fmt(2.5, { decimals: 0, rounding: 'banker' })).toBe('2')
        expect(fmt(1.001, { decimals: 0, rounding: 'ceil' })).toBe('2')
    })

    it('fraction output', () => {
        expect(fmt(0.5, { output: 'fraction' })).toBe('1/2')
        expect(fmt(0.25, { output: 'fraction' })).toBe('1/4')
    })
})

describe('chain API', () => {
    it('chainAdd basic', () => {
        expect(chainAdd(100, 200, 300)()).toBe('600')
        expect(chainAdd(1, 2, 3)()).toBe('6')
    })

    it('chaining .add().sub().mul()', () => {
        expect(chainAdd(10).sub(3).mul(2)()).toBe('14')
    })

    it('chaining with formatting', () => {
        expect(chainAdd(100, 200).mul(2)({ decimals: 2, thousands: true })).toBe('600.00')
        expect(chainAdd(1000, 2000)({ decimals: 2, thousands: true })).toBe('3,000.00')
    })

    it('chainSub / chainMul / chainDiv', () => {
        expect(chainSub(10, 3, 2)()).toBe('5')
        expect(chainMul(2, 3, 4)()).toBe('24')
        expect(chainDiv(100, 4, 5)()).toBe('5')
    })
})

describe('standalone operations add/sub/mul/div', () => {
    it('returns number', () => {
        expect(add(0.1, 0.2)).toBe(0.3)
        expect(sub(1, 0.3)).toBe(0.7)
        expect(mul(3, 4, 5)).toBe(60)
        expect(div(10, 4)).toBe(2.5)
    })

    it('str-suffix returns string', () => {
        expect(addStr('0.1', '0.2')).toBe('0.3')
    })
})

describe('aggregation', () => {
    it('calcSum / calcAvg', () => {
        expect(calcSum('price', [{ price: 10 }, { price: 20 }])).toBe('30')
        expect(calcAvg('score', [{ score: 80 }, { score: 90 }])).toBe('85')
    })

    it('array form', () => {
        expect(calcSum([1, 2, 3])).toBe('6')
        expect(calcAvg([1, 2, 3])).toBe('2')
    })

    it('calcMax / calcMin', () => {
        expect(calcMax([3, 1, 2])).toBe('3')
        expect(calcMin([3, 1, 2])).toBe('1')
    })

    it('skips null / undefined values (common from backends, does not throw)', () => {
        const list = [{ p: 1 }, { p: null }, { p: 3 }, { p: undefined }] as any[]
        expect(calcSum('p', list)).toBe('4')
        expect(calcAvg('p', list)).toBe('2') // denominator counts only non-null items: 4 / 2
        expect(calcMax('p', list)).toBe('3')
        expect(calcMin('p', list)).toBe('1')
        // array form also skips nulls
        expect(calcSum([1, null, 3, undefined] as any[])).toBe('4')
        // all-null input ⇒ fallback '0', does not throw
        expect(calcSum('p', [{ p: null }, { p: undefined }] as any[])).toBe('0')
        expect(calcAvg('p', [{ p: null }] as any[])).toBe('0')
    })
})

describe('global config', () => {
    it('_error global config (only affects fmt fallback, calc still throws)', () => {
        setConfig({ _error: 0 })
        expect(fmt('1 + x')).toBe(0)
        resetConfig()
        expect(fmt('1 + x')).toBe('-')
        expect(() => calc('1 + x')).toThrow()
    })

    it('_fmt global defaults', () => {
        setConfig({ _fmt: { decimals: 2, thousands: true } })
        expect(calc('1000 + 234')).toBe('1,234.00')
        resetConfig()
    })
})

describe('built-in math functions', () => {
    it('abs / sign', () => {
        expect(calc('abs(-3.5)')).toBe('3.5')
        expect(calc('sign(-2)')).toBe('-1')
        expect(calc('sign(0)')).toBe('0')
        expect(calc('sign(9)')).toBe('1')
    })
    it('floor / ceil / round / trunc (negatives follow JS Math semantics)', () => {
        expect(calc('floor(2.7)')).toBe('2')
        expect(calc('floor(-2.7)')).toBe('-3')
        expect(calc('ceil(2.1)')).toBe('3')
        expect(calc('ceil(-2.7)')).toBe('-2')
        expect(calc('round(2.5)')).toBe('3')
        expect(calc('round(-2.5)')).toBe('-2') // same as Math.round
        expect(calc('trunc(-2.7)')).toBe('-2')
    })
    it('min / max / clamp', () => {
        expect(calc('min(3, 1, 2)')).toBe('1')
        expect(calc('max(3, 1, 2)')).toBe('3')
        expect(calc('clamp(150, 0, 100)')).toBe('100')
        expect(calc('clamp(-5, 0, 100)')).toBe('0')
        expect(calc('clamp(50, 0, 100)')).toBe('50')
    })
    it('pow / mod (exact)', () => {
        expect(calc('pow(2, 10)')).toBe('1024')
        expect(calc('pow(1.1, 2)')).toBe('1.21')
        expect(calc('pow(2, -1)')).toBe('0.5')
        expect(calc('mod(10, 3)')).toBe('1')
        expect(calc('mod(-7, 3)')).toBe('-1') // remainder sign matches the dividend
    })
    it('math functions with template interpolation', () => {
        const a = 3
        const b = 5
        expect(calc(`max(${a}, ${b}) * 2`)).toBe('10')
        expect(calc(`abs(${a} - 10)`)).toBe('7')
    })
    it('invalid usage throws', () => {
        expect(() => calc('pow(2, 0.5)')).toThrow() // non-integer exponent
        expect(() => calc('sqrt(4)')).toThrow() // unknown function
    })
})

describe('conditional / comparison / logical operators removed (pure arithmetic only)', () => {
    it('ternary / comparison / logical / if are no longer supported (illegal characters throw)', () => {
        expect(() => calc('1 > 0 ? 1 : 0')).toThrow()
        expect(() => calc('1 == 1')).toThrow()
        expect(() => calc('1 && 1')).toThrow()
        expect(() => calc('if(1, 2, 3)')).toThrow()
    })
    it('pure arithmetic and math functions still work', () => {
        expect(calc('(1 + 2) * 3')).toBe('9')
        expect(calc('max(min(5, 3), 2)')).toBe('3')
    })
})

describe('complex compound expressions (cross-verified against mathjs high precision)', () => {
    it('chained addition', () => {
        expect(calc('0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 0.6 + 0.7 + 0.8 + 0.9')).toBe('4.5')
    })
    it('discount / threshold reduction (finite decimals, exact)', () => {
        expect(calc('(999.99 * 3 + 499.5 * 2 + 199.9 * 5) * 0.85 - 200')).toBe('4048.6995')
        expect(calc('(128.8 * 2 + 256.6 * 3 + 64.4 * 5 + 512.2) * 0.92 - 50')).toBe('1662.672')
        expect(calc('(2999 - 500) * 0.88 * 0.95 * 0.98 + 15 * 3')).toBe('2092.38072')
    })
    it('tax rate / commission', () => {
        expect(calc('((85000 - 5000) * 0.8 + 5000) * 0.13 + 1000 * 0.06')).toBe('9030')
    })
    it('nested parentheses with all four operations', () => {
        expect(calc('((1000 + 500) * 2 - 300) / 4 + (800 - 200) * 1.5 / 3')).toBe('975')
    })
    it('compound interest (integer exponents, exact)', () => {
        expect(calc('100000 * 1.004 * 1.004 * 1.004 * 1.004 * 1.004 * 1.004 - 100000')).toBe('2424.1283846148096')
    })
    it('with repeating decimals (truncated to 10 digits for verification)', () => {
        expect(calc('10000 / 7.25 * 1.08 / 0.92 * 7.25 / 1.05', { _fmt: { decimals: 10 } })).toBe('11180.1242236024')
        expect(calc('1000 / 3 + 2000 / 7 + 3000 / 11 + 4000 / 13 + 5000 / 17', { _fmt: { decimals: 10 } })).toBe('1493.5848465260')
        expect(calc('((299.9 + 399.9 + 599.9) * 2 + 99.9 * 5) / 3 * 0.95', { _fmt: { decimals: 10 } })).toBe('981.3183333333')
    })
})

// All expected values independently computed by mathjs BigNumber (80-digit precision) and cross-verified, zero deviation
describe('complex compound expressions — extended (cross-verified against mathjs 80-digit)', () => {
    it('mixed four operations (finite decimals, exact)', () => {
        expect(calc('12.5 * 4 + 7.25 * 8 - 3.5 * 2')).toBe('101')
        expect(calc('(19.99 + 29.99 + 9.99) * 3 - 15.5')).toBe('164.41')
        expect(calc('(2500 - 199.99) * 0.9 + 49.9 * 3')).toBe('2219.709')
        expect(calc('(3.14159 * 2 + 1.41421 * 3) * 100')).toBe('1052.581')
    })
    it('discount / commission / compound interest (integer exponents, exact)', () => {
        expect(calc('1000 * 1.05 * 1.05 * 1.05 - 1000')).toBe('157.625')
        expect(calc('pow(1.02, 5) * 10000 - 10000')).toBe('1040.808032')
        expect(calc('(48.8 * 12 + 36.6 * 8) * 0.88 * 0.95')).toBe('734.3424')
        expect(calc('((5000 * 0.7 + 2000) * 1.06 - 500) * 0.99')).toBe('5276.7')
    })
    it('negatives / abs / mod / min / max / pow combined', () => {
        expect(calc('-15.5 + 32.25 * 2 - abs(-8.75)')).toBe('40.25')
        expect(calc('mod(100, 7) + mod(55, 6) * 2')).toBe('4')
        expect(calc('max(88.8, 99.9, 77.7) * 3 - min(12.5, 8.25, 19.9)')).toBe('291.45')
        expect(calc('pow(2, 16) / 1024 + pow(3, 4) * 1.5')).toBe('185.5')
    })
    it('with repeating decimals (truncated for verification)', () => {
        expect(calc('(100 / 3 + 200 / 9) * 1.5', { _fmt: { decimals: 12 } })).toBe('83.333333333333')
        expect(calc('1 / 7 + 1 / 11 + 1 / 13 + 1 / 17 + 1 / 19', { _fmt: { decimals: 12 } })).toBe('0.422144419048')
        expect(calc('(12345.678 / 9.9 + 8765.4321 / 7.7) * 0.95', { _fmt: { decimals: 10 } })).toBe('2266.1356876623')
        expect(calc('10000 / 3 * 0.15 / 1.13 + 250 / 7', { _fmt: { decimals: 10 } })).toBe('478.1921618204')
    })
})

describe('value clamping', () => {
    it('clamps to boundary', () => {
        expect(calc('150', { _fmt: { clamp: [0, 100] } })).toBe('100')
        expect(calc('-50', { _fmt: { clamp: [0, 100] } })).toBe('0')
        expect(calc('50', { _fmt: { clamp: [0, 100] } })).toBe('50')
    })
    it('combined with formatting', () => {
        expect(calc('150.567', { _fmt: { clamp: [0, 100], decimals: 2 } })).toBe('100.00')
        expect(calc('15000', { _fmt: { clamp: [0, 10000], thousands: true } })).toBe('10,000')
    })
    it('also works with fmt', () => {
        expect(fmt(150, { clamp: [0, 100] })).toBe('100')
    })
})

describe('format object (IFormat)', () => {
    it('decimals as number = fixed places / thousands separator', () => {
        expect(fmt(1234.5, { decimals: 2, thousands: true })).toBe('1,234.50')
        expect(calc('1000 + 234', { _fmt: { decimals: 2, thousands: true } })).toBe('1,234.00')
    })
    it('decimals as object = range (max ≡ <=N)', () => {
        expect(fmt(1.5, { decimals: { max: 2 } })).toBe('1.5')
        expect(fmt(1, { decimals: { min: 2 } })).toBe('1.00')
    })
    it('output accepts both human-readable words and token symbols', () => {
        expect(fmt(0.1234, { output: 'percent', decimals: 1 })).toBe('12.3%')
        expect(fmt(0.1234, { output: '%%', decimals: 1 })).toBe('12.3%')
        expect(fmt(0.5, { output: 'fraction' })).toBe('1/2')
        expect(fmt(0.5, { output: '//' })).toBe('1/2')
        expect(fmt(1000, { output: 'scientific' })).toBe('1e+3')
        expect(fmt(0.12, { output: 'number', decimals: 1 })).toBe(0.1)
        expect(fmt(0.12, { output: 'num', decimals: 1 })).toBe(0.1)
    })
    it('rounding JS-style aliases: round / trunc / halfEven', () => {
        expect(fmt(1.235, { decimals: 2, rounding: 'round' })).toBe('1.24') // half-up rounding
        expect(fmt(1.239, { decimals: 2, rounding: 'trunc' })).toBe('1.23') // truncation
        expect(fmt(1.235, { decimals: 2, rounding: 'halfUp' })).toBe('1.24')
        expect(fmt(2.5, { decimals: 0, rounding: 'halfEven' })).toBe('2') // banker: round to even
        expect(fmt(3.5, { decimals: 0, rounding: 'halfEven' })).toBe('4')
        expect(fmt(2.5, { decimals: 0, rounding: 'banker' })).toBe('2') // alias, equivalent
    })
    it('thousands / compact presets', () => {
        expect(fmt(1234.5, { thousands: 'eu', decimals: 2 })).toBe('1.234,50')
        expect(fmt(12345678, { compact: 'zh', decimals: 2 })).toBe('1234.56万') // default truncation
    })
    it('clamp range + plus + pad', () => {
        expect(calc('150', { _fmt: { clamp: [0, 100] } })).toBe('100')
        expect(fmt(150, { clamp: [0, 100] })).toBe('100')
        expect(fmt(5, { plus: true })).toBe('+5')
        expect(fmt(5, { pad: 3 })).toBe('005')
    })
    it('chain terminator accepts format object', () => {
        expect(chainAdd(1000, 2000)({ decimals: 2, thousands: true })).toBe('3,000.00')
    })
})

describe('_debug', () => {
    it('_debug callback collects step-by-step evaluation', () => {
        let info: any
        calc('max(1, 3) * 2', { _debug: i => (info = i) })
        expect(info.expr).toBe('max(1, 3) * 2')
        expect(info.result).toBe('6')
        expect(info.steps.some((s: string) => s.includes('max'))).toBe(true)
    })
    it('_debug false / omitted does not trigger callback', () => {
        let count = 0
        const cb = () => void count++
        calc('1 + 1', { _debug: false })
        calc('1 + 1')
        expect(count).toBe(0)
        calc('1 + 1', { _debug: cb }) // only triggered when a function is passed
        expect(count).toBe(1)
    })
})

describe('error handling: fmt falls back gracefully, everything else throws', () => {
    it('standalone add/sub/mul/div/addStr throws on error', () => {
        expect(() => add('123', 'ss')).toThrow()
        expect(() => sub('1', 'x')).toThrow()
        expect(() => mul('a', 2)).toThrow()
        expect(() => div('1', 'b')).toThrow()
        expect(() => addStr('1', 'x')).toThrow()
    })

    it('chain / aggregation throws on error', () => {
        expect(() => chainAdd(1).add('ss')).toThrow()
        expect(() => chainMul('x', 2)).toThrow()
        expect(() => calcSum(['1', 'x', '3'])).toThrow()
        expect(() => calcMax(['1', 'y'])).toThrow()
    })

    it('fmt falls back to _error on failure; calc still throws', () => {
        resetConfig() // default _error '-'
        expect(fmt('1 + x')).toBe('-')
        expect(fmt('not-a-number')).toBe('-')
        expect(() => calc('1 + x')).toThrow()
        setConfig({ _error: 0 })
        expect(fmt('1 + x')).toBe(0) // global _error
        expect(fmt('1 + x', { _error: -1 })).toBe(-1) // local overrides global
        resetConfig()
    })
})

describe('fmt as display function: supports expressions and falls back on error', () => {
    it('first argument can be an arithmetic expression: evaluates then formats', () => {
        expect(fmt('1 + 2 * 3')).toBe('7')
        expect(fmt('0.1 + 0.2')).toBe('0.3') // precision correct
        expect(fmt('999.99 * 3', { decimals: 2, thousands: true })).toBe('2,999.97')
    })
    it('number / bigint formatted directly', () => {
        expect(fmt(1234.5, { decimals: 2, thousands: true })).toBe('1,234.50')
        expect(fmt(1000000n, { decimals: 2, compact: true })).toBe('1.00M')
    })
    it('falls back to _error on failure (local takes priority over global)', () => {
        resetConfig()
        expect(fmt('bad expr')).toBe('-')
        expect(fmt('1 + x', { _error: 0 })).toBe(0)
    })
})

describe('per-call precision override (trailing { _precision })', () => {
    it('div / divStr accept trailing precision, does not pollute global config', () => {
        resetConfig()
        expect(divStr('1', '3', { _precision: 5 })).toBe('0.33333')
        expect(divStr('100', '3', { _precision: 2 })).toBe('33.33')
        expect(div(100, 3, { _precision: 5 })).toBe(33.33333)
        // without override, uses global 50-digit precision
        expect(divStr('1', '3').length).toBeGreaterThan(10)
        // global precision is not polluted
        expect(getConfig()._precision).toBe(50)
    })

    it('chainDiv trailing precision applies to all division in the chain (including subsequent .div)', () => {
        resetConfig()
        expect(chainDiv(100, 3, { _precision: 5 })()).toBe('33.33333')
        expect(chainDiv(100, { _precision: 4 }).div(3)()).toBe('33.3333')
        expect(getConfig()._precision).toBe(50)
    })

    it('calcAvg supports trailing precision in both array and field-name forms', () => {
        resetConfig()
        expect(calcAvg([10, 20, 25], { _precision: 2 })).toBe('18.33')
        expect(calcAvg('score', [{ score: 10 }, { score: 20 }, { score: 25 }], { _precision: 2 })).toBe('18.33')
        // both forms work normally without opt
        expect(calcAvg([1, 2, 3])).toBe('2')
        expect(calcAvg('s', [{ s: 1 }, { s: 3 }])).toBe('2')
        expect(getConfig()._precision).toBe(50)
    })
})
