// Chaining API: chainAdd/chainSub/chainMul/chainDiv → returns an object supporting further .add().sub().mul().div() calls
// Terminate: call with () or (formatStr) to obtain the final string/number result
// Errors (invalid arguments, etc.) are thrown directly and must be handled by the caller

import type { IGlobalConfig, IPrecisionOption } from './config'
import type { IFormat } from './format'
import { configWithPrecision, getConfig } from './config'
import { formatValue, normalizeFormat } from './format'
import { add, div, mul, sub } from './precision'

type Val = string | number | bigint

/** Extracts a per-call precision option from the end of a variadic argument list (last element is an object ⇒ treated as {@link IPrecisionOption}). */
const splitPrecision = (args: Array<Val | IPrecisionOption>): [Val[], IPrecisionOption?] => {
    const last = args.at(-1)
    if (last != null && typeof last === 'object') {
        return [args.slice(0, -1) as Val[], last as IPrecisionOption]
    }
    return [args as Val[], undefined]
}

/**
 * A chaining computation object. Every arithmetic method returns itself for further chaining;
 * calling it as a function terminates the chain and returns the result.
 */
export interface IChain {
    /** Continues accumulating additions; returns itself for chaining. */
    add: (...args: Val[]) => IChain
    /** Continues accumulating subtractions; returns itself. */
    sub: (...args: Val[]) => IChain
    /** Continues accumulating multiplications; returns itself. */
    mul: (...args: Val[]) => IChain
    /** Continues accumulating divisions (uses the instance's `_precision`); returns itself. */
    div: (...args: Val[]) => IChain
    /**
     * Terminates the chain and retrieves the result: no argument ⇒ returns the current value (`string`);
     * pass an {@link IFormat} object ⇒ returns `string | number` according to the formatting rules.
     */
    (format?: IFormat): string | number
}

const makeChain = (cfg: IGlobalConfig, initial: string): IChain => {
    let value = initial
    const fn = ((format?: IFormat): string | number => {
        if (!format) return value
        return formatValue(value, normalizeFormat(format))
    }) as IChain

    fn.add = (...args: Val[]) => {
        for (const a of args) value = add(value, a)
        return fn
    }
    fn.sub = (...args: Val[]) => {
        for (const a of args) value = sub(value, a)
        return fn
    }
    fn.mul = (...args: Val[]) => {
        for (const a of args) value = mul(value, a)
        return fn
    }
    fn.div = (...args: Val[]) => {
        for (const a of args) value = div(value, a, cfg._precision)
        return fn
    }
    return fn
}

const reduceWith = (op: (a: string, b: Val) => string, args: Val[]): string => {
    if (args.length === 0) return '0'
    let r = String(args[0])
    for (let i = 1; i < args.length; i++) r = op(r, args[i]!)
    return r
}

// ── Internal implementations that accept a config (shared by default exports and per-call precision entry points) ──
export const chainAddWith = (cfg: IGlobalConfig, ...args: Val[]): IChain => makeChain(cfg, reduceWith(add, args))
export const chainSubWith = (cfg: IGlobalConfig, ...args: Val[]): IChain => makeChain(cfg, reduceWith(sub, args))
export const chainMulWith = (cfg: IGlobalConfig, ...args: Val[]): IChain => makeChain(cfg, reduceWith(mul, args))
export const chainDivWith = (cfg: IGlobalConfig, ...args: Val[]): IChain => makeChain(cfg, reduceWith((a, b) => div(a, b, cfg._precision), args))

/**
 * Starts a chaining computation with addition (`a + b + c ...`).
 *
 * @param args Initial values to accumulate via addition
 * @returns An {@link IChain} supporting further `.add().sub().mul().div()` calls
 * @example
 * chainAdd(1, 2).mul(3)()                // '9'
 * chainAdd(1, 2).mul(3)({ decimals: 2 }) // '9.00'
 */
export const chainAdd = (...args: Val[]): IChain => chainAddWith(getConfig(), ...args)
/**
 * Starts a chaining computation with subtraction (`a - b - c ...`).
 *
 * @param args Initial minuend and subtrahends
 * @returns An {@link IChain} supporting further chaining
 * @example
 * chainSub(10, 1, 2)() // '7'
 */
export const chainSub = (...args: Val[]): IChain => chainSubWith(getConfig(), ...args)
/**
 * Starts a chaining computation with multiplication (`a * b * c ...`).
 *
 * @param args Initial factors to multiply together
 * @returns An {@link IChain} supporting further chaining
 * @example
 * chainMul(2, 3).add(4)() // '10'
 */
export const chainMul = (...args: Val[]): IChain => chainMulWith(getConfig(), ...args)
/**
 * Starts a chaining computation with division (`a / b / c ...`).
 *
 * Precision defaults to the global `_precision`; pass `{ _precision }` as the **last** argument
 * to override the division precision for this chain (including subsequent `.div()` calls)
 * without affecting the global config.
 *
 * @param args Initial dividend and divisors, with an optional {@link IPrecisionOption} at the end
 * @returns An {@link IChain} supporting further chaining
 * @example
 * chainDiv(100, 4)()                    // '25'
 * chainDiv(100, 3, { _precision: 5 })() // '33.33333'
 */
export function chainDiv(...args: Val[]): IChain
export function chainDiv(...args: [...Val[], IPrecisionOption]): IChain
export function chainDiv(...args: Array<Val | IPrecisionOption>): IChain {
    const [values, opt] = splitPrecision(args)
    return chainDivWith(configWithPrecision(opt), ...values)
}
