import { calc as aCalc } from 'a-calc'
import Decimal from 'decimal.js'
import { all, create } from 'mathjs'
import { bench, describe } from 'vitest'
import { addStr, calc, div, mul } from '../src'

// Cross-library comparison: @wzo/calc vs a-calc vs decimal.js vs mathjs
// Run: pnpm --filter @wzo/calc bench compare

// Align precision: decimal.js / mathjs set to 50 significant digits (our div uses 50 decimal digits, comparable magnitude)
Decimal.set({ precision: 50 })
// @ts-expect-error mathjs: in this version the all factory map type is inferred as nullable, but it works fine at runtime
const math = create(all, { number: 'BigNumber', precision: 50 })
const mBig = math.bignumber

describe('precision addition 0.1 + 0.2 (string in / out)', () => {
    bench('@wzo/calc  addStr', () => {
        addStr('0.1', '0.2')
    })
    bench('decimal.js', () => {
        new Decimal('0.1').plus('0.2').toString()
    })
    bench('a-calc', () => {
        aCalc('0.1 + 0.2')
    })
    bench('mathjs (bignumber)', () => {
        math.add(mBig('0.1'), mBig('0.2')).toString()
    })
})

describe('precision multiplication 1.1 * 2.2', () => {
    bench('@wzo/calc  mul', () => {
        mul('1.1', '2.2')
    })
    bench('decimal.js', () => {
        new Decimal('1.1').times('2.2').toString()
    })
    bench('a-calc', () => {
        aCalc('1.1 * 2.2')
    })
    bench('mathjs (bignumber)', () => {
        math.multiply(mBig('1.1'), mBig('2.2')).toString()
    })
})

describe('high-precision division 1 / 3', () => {
    bench('@wzo/calc  div (50 decimal digits)', () => {
        div('1', '3')
    })
    bench('decimal.js (50 significant digits)', () => {
        new Decimal(1).div(3).toString()
    })
    bench('a-calc', () => {
        aCalc('1 / 3')
    })
    bench('mathjs (bignumber 50)', () => {
        math.divide(mBig(1), mBig(3)).toString()
    })
})

describe('expression evaluation 1 + 2 * 2', () => {
    bench('@wzo/calc  calc', () => {
        calc('1 + 2 * 2')
    })
    bench('a-calc', () => {
        aCalc('1 + 2 * 2')
    })
    bench('mathjs  evaluate', () => {
        math.evaluate('1 + 2 * 2')
    })
    // decimal.js has no expression parser, skipped
})

// Complex compound expression: nested parentheses + discount / threshold reduction (finite decimals, exact evaluation)
const EXPR_FINITE = '(999.99 * 3 + 499.5 * 2 + 199.9 * 5) * 0.85 - 200'
describe('complex expression (finite decimals) (999.99*3 + 499.5*2 + 199.9*5)*0.85 - 200', () => {
    bench('@wzo/calc  calc', () => {
        calc(EXPR_FINITE)
    })
    bench('a-calc', () => {
        aCalc(EXPR_FINITE)
    })
    bench('mathjs  evaluate', () => {
        math.evaluate(EXPR_FINITE).toString()
    })
})

// Complex expression: multiple divisions → repeating decimals (the most demanding case for the high-precision path)
const EXPR_DIV = '1000 / 3 + 2000 / 7 + 3000 / 11 + 4000 / 13 + 5000 / 17'
describe('complex expression (repeating decimals) 1000/3 + 2000/7 + 3000/11 + 4000/13 + 5000/17', () => {
    bench('@wzo/calc  calc', () => {
        calc(EXPR_DIV)
    })
    bench('a-calc', () => {
        aCalc(EXPR_DIV)
    })
    bench('mathjs  evaluate', () => {
        math.evaluate(EXPR_DIV).toString()
    })
})

// Compound interest: 100000 × 1.004^6 − 100000 (repeated multiplication)
const EXPR_COMPOUND = '100000 * 1.004 * 1.004 * 1.004 * 1.004 * 1.004 * 1.004 - 100000'
describe('compound interest repeated multiplication 100000 * 1.004^6 - 100000', () => {
    bench('@wzo/calc  calc', () => {
        calc(EXPR_COMPOUND)
    })
    bench('a-calc', () => {
        aCalc(EXPR_COMPOUND)
    })
    bench('mathjs  evaluate', () => {
        math.evaluate(EXPR_COMPOUND).toString()
    })
})
