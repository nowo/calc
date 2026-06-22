// Entry point calc(): arithmetic expression evaluation → (optional) formatting

import type { IGlobalConfig } from './config'
import type { IFormat } from './format'
import type { IEvalContext } from './parser'
import { getConfig } from './config'
import { formatValue, normalizeFormat } from './format'
import { evaluate } from './parser'

/** Control options for {@link calc} (all prefixed with `_`; variables are not supported — embed values via template interpolation) */
export interface ICalcOptions {
    /** true ⇒ enable unit mode (% is treated as a unit marker rather than division by 100; the result retains the % suffix) */
    _unit?: boolean
    /** Explicit format: an {@link IFormat} options object */
    _fmt?: IFormat
    /** Division precision (defaults to the global `_precision`) */
    _precision?: number
    /**
     * Step-by-step evaluation debug:
     * - `true` ⇒ prints to console
     * - pass a function ⇒ receives {@link IDebugInfo} via callback, no console output
     */
    _debug?: boolean | ((info: IDebugInfo) => void)
}

/** Evaluation info collected by `_debug` */
export interface IDebugInfo {
    /** The original expression */
    expr: string
    /** Step-by-step evaluation trace (one entry per step) */
    steps: string[]
    /** Raw result before formatting */
    value: string
    /** Final returned value */
    result: string | number
}

const RE_HAS_PERCENT = /%/

const emitDebug = (info: IDebugInfo, debug: true | ((info: IDebugInfo) => void)): void => {
    if (typeof debug === 'function') {
        debug(info)
        return
    }
    // eslint-disable-next-line no-console
    console.log(
        `[calc] ${info.expr}\n${
            info.steps.length ? `${info.steps.map(s => `  · ${s}`).join('\n')}\n` : ''
        }  = ${info.result}`,
    )
}

/** Evaluate with an explicit config (the default export {@link calc} delegates to this). */
export function calcWith(cfg: IGlobalConfig, expr: string, options: ICalcOptions = {}): string | number {
    const steps = options._debug ? [] as string[] : undefined
    const ctx: IEvalContext = {
        unit: !!options._unit,
        precision: options._precision ?? cfg._precision,
        trace: steps,
    }
    const value = evaluate(expr, ctx)

    // Unit mode: if the expression contains %, append % to the result (only when no explicit format is set)
    const exprHasPercent = options._unit && RE_HAS_PERCENT.test(expr)

    const fmtSpec = options._fmt || cfg._fmt
    const result = !fmtSpec
        ? (exprHasPercent ? `${value}%` : value)
        : formatValue(value, normalizeFormat(fmtSpec))

    if (options._debug) emitDebug({ expr, steps: steps!, value, result }, options._debug)
    return result
}

/**
 * Main entry point: evaluates an arithmetic expression string and optionally formats the output.
 *
 * Expressions are pure arithmetic: the four basic operations, parentheses, and math functions
 * (`max`/`min`/`clamp`…). **Variables are not supported** — embed values directly in the
 * expression via template interpolation: `` calc(`${price} * ${qty}`) ``.
 * Formatting is specified via `options._fmt` (an {@link IFormat} object).
 *
 * `calc` is designed for **computation**: on error (invalid expression, etc.) it **throws
 * directly** and the caller is responsible for handling it.
 * For **display** scenarios that need a fallback on error, use {@link fmt} instead
 * (same API and supports arithmetic, but returns `_error` on failure rather than throwing).
 *
 * @param expr Arithmetic expression, e.g. `'1 + 2 * 3'`, `'(1 + 2) / 3'`
 * @param options Control options (see {@link ICalcOptions})
 * @returns Computation result (`string`; `number` when `_fmt.output` is `'number'`)
 * @throws Throws when the expression is invalid
 * @example
 * calc('1 + 2 * 3')                        // '7'
 * calc(`${price} * ${qty}`)                // use template interpolation instead of variables
 * calc('1 + 2', { _fmt: { decimals: 2 } }) // '3.00'
 */
export const calc = (expr: string, options: ICalcOptions = {}): string | number => calcWith(getConfig(), expr, options)

/** Direct formatting */
export { fmt } from './format'
