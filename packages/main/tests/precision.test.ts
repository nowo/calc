import { describe, expect, it } from 'vitest'
import { abs, add, cmp, div, mod, mul, neg, pow, roundBanker, roundCeil, roundExpand, roundFloor, roundHalfUp, sqrt, sub, truncate } from '../src/utils/precision'

describe('precision arithmetic', () => {
    it('add resolves classic floating-point cases', () => {
        expect(add('0.1', '0.2')).toBe('0.3')
        expect(add('0.1', 0.2)).toBe('0.3')
        expect(add(0.1, '0.2')).toBe('0.3')
    })

    it('add with negatives and carry', () => {
        expect(add('1.5', '-0.5')).toBe('1')
        expect(add('-1.5', '0.5')).toBe('-1')
        expect(add('999', '1')).toBe('1000')
        expect(add('0', '0')).toBe('0')
    })

    it('sub', () => {
        expect(sub('1', '0.3')).toBe('0.7')
        expect(sub('0.3', '0.1')).toBe('0.2')
        expect(sub('0.5', '0.5')).toBe('0')
        expect(sub('1', '5')).toBe('-4')
    })

    it('mul resolves classic floating-point cases', () => {
        expect(mul('0.1', '0.2')).toBe('0.02')
        expect(mul('0.3', '3')).toBe('0.9')
        expect(mul('-2', '3')).toBe('-6')
        expect(mul('0', '999')).toBe('0')
    })

    it('div exact division', () => {
        expect(div('10', '2')).toBe('5')
        expect(div('1', '4')).toBe('0.25')
    })

    it('div repeating decimal yields 50-digit precision', () => {
        const r = div('1', '3')
        expect(r.length).toBeGreaterThan(40)
        expect(r.startsWith('0.33333')).toBe(true)
    })

    it('div precision truncation', () => {
        expect(div('1', '3', 5)).toBe('0.33333')
        expect(div('2', '3', 5)).toBe('0.66667') // rounded
    })

    it('div throws on division by zero', () => {
        expect(() => div('1', '0')).toThrow('Division by zero')
    })

    it('cmp', () => {
        expect(cmp('1', '2')).toBe(-1)
        expect(cmp('2', '1')).toBe(1)
        expect(cmp('1', '1.0')).toBe(0)
        expect(cmp('-1', '1')).toBe(-1)
        expect(cmp('0', '-0')).toBe(0)
    })

    it('neg / abs', () => {
        expect(neg('1.5')).toBe('-1.5')
        expect(neg('-1.5')).toBe('1.5')
        expect(neg('0')).toBe('0')
        expect(abs('-1.5')).toBe('1.5')
        expect(abs('1.5')).toBe('1.5')
    })

    it('truncate', () => {
        expect(truncate('1.999', 2)).toBe('1.99')
        expect(truncate('1.999', 0)).toBe('1')
        expect(truncate('1', 2)).toBe('1')
    })

    it('roundHalfUp', () => {
        expect(roundHalfUp('1.235', 2)).toBe('1.24')
        expect(roundHalfUp('1.234', 2)).toBe('1.23')
        expect(roundHalfUp('1.5', 0)).toBe('2')
    })

    it('roundCeil (toward +∞, like Math.ceil)', () => {
        expect(roundCeil('1.001', 0)).toBe('2')
        expect(roundCeil('-1.001', 0)).toBe('-1') // negatives round toward zero
        expect(roundCeil('1.5', 0)).toBe('2')
    })

    it('roundFloor (toward -∞, like Math.floor)', () => {
        expect(roundFloor('1.999', 0)).toBe('1') // positives round toward zero
        expect(roundFloor('-1.001', 0)).toBe('-2')
        expect(roundFloor('-1.5', 0)).toBe('-2')
    })

    it('roundExpand (away from zero)', () => {
        expect(roundExpand('1.001', 0)).toBe('2')
        expect(roundExpand('-1.001', 0)).toBe('-2')
        expect(roundExpand('1.5', 0)).toBe('2')
    })

    it('roundBanker (exact 0.5 rounds to even)', () => {
        expect(roundBanker('0.5', 0)).toBe('0')
        expect(roundBanker('1.5', 0)).toBe('2')
        expect(roundBanker('2.5', 0)).toBe('2')
        expect(roundBanker('3.5', 0)).toBe('4')
    })

    it('sqrt (BigInt integer square root, rounded to precision)', () => {
        expect(sqrt('4')).toBe('2')
        expect(sqrt('0')).toBe('0')
        expect(sqrt('152.2756')).toBe('12.34')
        expect(sqrt('2', 6)).toBe('1.414214')
        expect(sqrt('2', 10)).toBe('1.4142135624')
        expect(() => sqrt('-1')).toThrow()
    })

    it('pow (integer exponent, negative uses division)', () => {
        expect(pow('2', 10)).toBe('1024')
        expect(pow('1.1', 2)).toBe('1.21')
        expect(pow('2', -1)).toBe('0.5')
        expect(pow('5', 0)).toBe('1')
        expect(() => pow('2', 0.5)).toThrow()
    })

    it('mod (remainder follows dividend sign, exact)', () => {
        expect(mod('10', '3')).toBe('1')
        expect(mod('-7', '3')).toBe('-1')
        expect(mod('7', '-3')).toBe('1')
        expect(mod('5.5', '2')).toBe('1.5')
        expect(() => mod('1', '0')).toThrow()
    })

    it('supports scientific notation input', () => {
        expect(add('1e-7', '1e-7')).toBe('0.0000002')
        expect(mul('1e3', '2')).toBe('2000')
    })
})
