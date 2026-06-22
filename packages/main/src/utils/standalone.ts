// Standalone arithmetic functions:
//   add/sub/mul/div             → return number (convenient for interop with native JS numbers)
//   addStr/subStr/mulStr/divStr → return string (preserves full precision)
// Errors (invalid arguments, etc.) are thrown directly; use the calc expression form if you need a fallback

import type { IGlobalConfig, IPrecisionOption } from './config'
import { configWithPrecision } from './config'
import * as precision from './precision'

type Val = string | number | bigint

const reduce = (op: (a: string, b: Val) => string, args: Val[]): string => {
    if (args.length === 0) return '0'
    let r = String(args[0])
    for (let i = 1; i < args.length; i++) r = op(r, args[i]!)
    return r
}

/** Extracts a per-call precision option from the end of a variadic argument list (last element is an object ⇒ treated as {@link IPrecisionOption}; Val is always string/number/bigint so there is no ambiguity). */
const splitPrecision = (args: Array<Val | IPrecisionOption>): [Val[], IPrecisionOption?] => {
    const last = args.at(-1)
    if (last != null && typeof last === 'object') {
        return [args.slice(0, -1) as Val[], last as IPrecisionOption]
    }
    return [args as Val[], undefined]
}

/** Division using the precision from the given config (shared by the default {@link div} export and per-call precision entry points). */
export const divWith = (cfg: IGlobalConfig, ...args: Val[]): number =>
    Number(reduce((a, b) => precision.div(a, b, cfg._precision), args))
/** Division using the given config precision, string-returning variant (shared implementation). */
export const divStrWith = (cfg: IGlobalConfig, ...args: Val[]): string =>
    reduce((a, b) => precision.div(a, b, cfg._precision), args)

/**
 * High-precision addition, result converted to `number` (convenient for interop with native numbers).
 *
 * @param args Any number of addends, accumulated left to right
 * @returns Sum (`number`)
 * @example
 * add(0.1, 0.2)       // 0.3
 * add(1, 2, 3, 4)     // 10
 */
export const add = (...args: Val[]): number => Number(reduce(precision.add, args))
/**
 * High-precision subtraction, result as `number`: `args[0] - args[1] - args[2] ...`.
 *
 * @param args Minuend followed by subtrahends
 * @returns Difference (`number`)
 * @example
 * sub(0.3, 0.1) // 0.2
 */
export const sub = (...args: Val[]): number => Number(reduce(precision.sub, args))
/**
 * High-precision multiplication, result as `number`, factors multiplied left to right.
 *
 * @param args Any number of factors
 * @returns Product (`number`)
 * @example
 * mul(0.1, 0.2) // 0.02
 */
export const mul = (...args: Val[]): number => Number(reduce(precision.mul, args))
/**
 * High-precision division, result as `number`: `args[0] / args[1] / args[2] ...`.
 *
 * Precision defaults to the global `_precision`; pass `{ _precision }` as the **last** argument
 * to override it for this call only (does not affect the global config).
 *
 * @param args Dividend and divisors, with an optional {@link IPrecisionOption} at the end
 * @returns Quotient (`number`)
 * @example
 * div(1, 3)                      // 0.333... (global precision)
 * div(100, 3, { _precision: 5 }) // 33.33333
 */
export function div(...args: Val[]): number
export function div(...args: [...Val[], IPrecisionOption]): number
export function div(...args: Array<Val | IPrecisionOption>): number {
    const [values, opt] = splitPrecision(args)
    return divWith(configWithPrecision(opt), ...values)
}

/**
 * High-precision addition, result returned as `string` (no precision loss; suitable for monetary values).
 *
 * @param args Any number of addends
 * @returns Sum (`string`)
 * @example
 * addStr('0.1', '0.2') // '0.3'
 */
export const addStr = (...args: Val[]): string => reduce(precision.add, args)
/**
 * High-precision subtraction, result as `string`: `args[0] - args[1] - ...`.
 *
 * @param args Minuend followed by subtrahends
 * @returns Difference (`string`)
 * @example
 * subStr('0.3', '0.1') // '0.2'
 */
export const subStr = (...args: Val[]): string => reduce(precision.sub, args)
/**
 * High-precision multiplication, result as `string`, factors multiplied left to right.
 *
 * @param args Any number of factors
 * @returns Product (`string`)
 * @example
 * mulStr('0.1', '0.2') // '0.02'
 */
export const mulStr = (...args: Val[]): string => reduce(precision.mul, args)
/**
 * High-precision division, result as `string`: `args[0] / args[1] / ...`.
 *
 * Precision defaults to the global `_precision`; pass `{ _precision }` as the **last** argument
 * to override it for this call only (does not affect the global config).
 *
 * @param args Dividend and divisors, with an optional {@link IPrecisionOption} at the end
 * @returns Quotient (`string`)
 * @example
 * divStr('1', '3')                      // '0.333...' (global precision)
 * divStr('100', '3', { _precision: 5 }) // '33.33333'
 */
export function divStr(...args: Val[]): string
export function divStr(...args: [...Val[], IPrecisionOption]): string
export function divStr(...args: Array<Val | IPrecisionOption>): string {
    const [values, opt] = splitPrecision(args)
    return divStrWith(configWithPrecision(opt), ...values)
}
