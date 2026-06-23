// Number formatting: parse token string → options → format
import type { IGlobalConfig } from './config'
import { getConfig } from './config'
import { evaluate } from './parser'
import { abs, cmp, div, format as fmtDecimal, mul, parse, roundBanker, roundCeil, roundExpand, roundFloor, roundHalfUp, truncate } from './precision'

/**
 * Rounding strategy. Directional modes match `Math`: `'ceil'` rounds toward `+∞`, `'floor'` toward `-∞`,
 * `'expand'` away from zero, `'truncate'` toward zero. Includes JS-style aliases:
 * `'round'`≡`'halfUp'` (same as `Math.round`), `'trunc'`≡`'truncate'` (same as `Math.trunc`),
 * `'halfEven'`≡`'banker'` (same as `Intl.NumberFormat` `roundingMode: 'halfEven'`, banker's rounding).
 */
export type Rounding = 'truncate' | 'trunc' | 'halfUp' | 'round' | 'banker' | 'halfEven' | 'ceil' | 'floor' | 'expand'

// Internal canonical rounding names (the modes recognized by applyRounding)
type Canon = 'truncate' | 'halfUp' | 'banker' | 'ceil' | 'floor' | 'expand'

/**
 * Format options object — passed to {@link fmt} / `calc`'s `_fmt` / chaining terminators.
 * Equivalent to a format token string but with full type hints.
 */
export interface IFormat {
    /** Decimal places: number = fixed (`=N`); object = range (`{ max }`≡`<=N`, `{ min }`≡`>=N`) */
    decimals?: number | { min?: number, max?: number }
    /** Rounding strategy (`~5`/`~6`/`~-`/`~+`) */
    rounding?: Rounding
    /** Thousands separator: `true` = US style; or `'us'`/`'eu'`/`'in'` (≡ `,` / `!t:preset`) */
    thousands?: boolean | 'us' | 'eu' | 'in'
    /** Compact notation: `true` = K/M/B/T; or `'zh'` = 万/亿 (≡ `!c` / `!c:preset`) */
    compact?: boolean | 'zh'
    /** Clamp value to `[min, max]`; out-of-range values are clamped to the boundary (≡ `[min,max]`) */
    clamp?: [number | string, number | string]
    /** Output form (mutually exclusive): accepts human-readable words or token symbols (≡ `%%` / `//` / `!e` / `!n`) */
    output?: 'percent' | '%%' | 'fraction' | '//' | 'scientific' | 'e' | 'number' | 'num'
    /** Show explicit plus sign (≡ `+`) */
    plus?: boolean
    /** Left-pad the integer part with zeros to N digits (≡ `!i:N`) */
    pad?: number
}

// Flat internal structure (output of normalizeFormat / input of formatValue)
export interface IFormatOpts {
    fixed?: number // =N
    max?: number // <=N
    min?: number // >=N
    thousands?: boolean // ,
    thousandsPreset?: 'us' | 'eu' | 'in'
    plus?: boolean // +
    percent?: boolean // %%
    fraction?: boolean // //
    scientific?: boolean // !e
    asNumber?: boolean // !n
    compact?: boolean // !c
    compactPreset?: string // !c:zh (Chinese 万/亿)
    intPad?: number // !i:N
    rounding?: Canon // ~- / ~5 / ~6 / ~+
    clampMin?: string // [min,max] lower bound
    clampMax?: string // [min,max] upper bound
}

// IFormat.rounding (including aliases) → internal canonical name
const ROUNDING_ALIAS: Record<Rounding, Canon> = {
    truncate: 'truncate',
    trunc: 'truncate',
    halfUp: 'halfUp',
    round: 'halfUp',
    banker: 'banker',
    halfEven: 'banker',
    ceil: 'ceil',
    floor: 'floor',
    expand: 'expand',
}

// IFormat.output (human-readable word / token symbol) → flat boolean field
const OUTPUT_FLAG: Record<string, 'percent' | 'fraction' | 'scientific' | 'asNumber'> = {
    'percent': 'percent',
    '%%': 'percent',
    'fraction': 'fraction',
    '//': 'fraction',
    'scientific': 'scientific',
    'e': 'scientific',
    'number': 'asNumber',
    'num': 'asNumber',
}

// ───── Module-level regexes ─────
const RE_THOUSANDS_GROUPS = /\B(?=(?:\d{3})+(?!\d))/g
const RE_TRAIL_ZERO = /0+$/
const RE_DOT_END = /\.$/
const RE_ZERO_VAL = /^0+(?:\.0+)?$/
const RE_COMMA_GLOBAL = /,/g

// ───── Rounding ─────
const applyRounding = (value: string, decimals: number, mode: Canon): string => {
    switch (mode) {
        case 'halfUp': return roundHalfUp(value, decimals)
        case 'banker': return roundBanker(value, decimals)
        case 'ceil': return roundCeil(value, decimals)
        case 'floor': return roundFloor(value, decimals)
        case 'expand': return roundExpand(value, decimals)
        case 'truncate':
        default: return truncate(value, decimals)
    }
}

// ───── Thousands separator (integer part only) ─────
const applyThousands = (intStr: string, preset?: 'us' | 'eu' | 'in'): string => {
    if (preset === 'in') {
        // Indian: last 3 digits, then groups of 2 (e.g. 123,45,678)
        if (intStr.length <= 3) return intStr
        const last3 = intStr.slice(-3)
        const restPart = intStr.slice(0, -3)
        const parts: string[] = []
        let r = restPart
        while (r.length > 2) {
            parts.unshift(r.slice(-2))
            r = r.slice(0, -2)
        }
        if (r) parts.unshift(r)
        return `${parts.join(',')},${last3}`
    }
    return intStr.replace(RE_THOUSANDS_GROUPS, ',')
}

// ───── Compact presets ─────
const COMPACT_PRESETS: Record<string, Array<{ scale: number, suffix: string }>> = {
    default: [
        { scale: 12, suffix: 'T' },
        { scale: 9, suffix: 'B' },
        { scale: 6, suffix: 'M' },
        { scale: 3, suffix: 'K' },
    ],
    // Chinese: 万 (10k) / 亿 (100M)
    zh: [
        { scale: 12, suffix: '万亿' },
        { scale: 8, suffix: '亿' },
        { scale: 4, suffix: '万' },
    ],
}

const applyCompact = (value: string, preset: string | undefined): { num: string, suffix: string } => {
    const presets = COMPACT_PRESETS[preset || 'default'] || COMPACT_PRESETS.default!
    const absValue = abs(value)
    for (const p of presets) {
        const threshold = `1${'0'.repeat(p.scale)}`
        if (cmp(absValue, threshold) >= 0) {
            return { num: div(value, threshold, 20), suffix: p.suffix }
        }
    }
    return { num: value, suffix: '' }
}

// ───── Scientific notation ─────
const applyScientific = (value: string): string => {
    const d = parse(value)
    if (d.digits === 0n) return '0e+0'
    const digitStr = d.digits.toString()
    const mantissaExp = digitStr.length - 1
    const e = mantissaExp - d.exp
    const mantissa = digitStr.length === 1
        ? digitStr
        : `${digitStr[0]}.${digitStr.slice(1).replace(RE_TRAIL_ZERO, '')}`.replace(RE_DOT_END, '')
    const sign = d.sign < 0 ? '-' : ''
    return `${sign}${mantissa}e${e >= 0 ? '+' : ''}${e}`
}

// ───── Fraction (reduced to lowest terms) ─────
const gcd = (a: bigint, b: bigint): bigint => b === 0n ? a : gcd(b, a % b)

const applyFraction = (value: string): string => {
    const d = parse(value)
    if (d.digits === 0n) return '0'
    if (d.exp === 0) return d.sign < 0 ? `-${d.digits}/1` : `${d.digits}/1`
    let num = d.digits
    let den = 10n ** BigInt(d.exp)
    const g = gcd(num, den)
    num /= g
    den /= g
    return `${d.sign < 0 ? '-' : ''}${num}/${den}`
}

// ───── Decimal / integer zero-padding ─────
const padDecimals = (v: string, n: number): string => {
    const dot = v.indexOf('.')
    if (n === 0) return dot === -1 ? v : v.slice(0, dot)
    if (dot === -1) return `${v}.${'0'.repeat(n)}`
    const fracLen = v.length - dot - 1
    if (fracLen >= n) return v
    return v + '0'.repeat(n - fracLen)
}

const padIntegerZeros = (v: string, n: number): string => {
    let sign = ''
    let s = v
    if (s.startsWith('-')) {
        sign = '-'
        s = s.slice(1)
    } else if (s.startsWith('+')) {
        sign = '+'
        s = s.slice(1)
    }
    const dot = s.indexOf('.')
    const intPart = dot === -1 ? s : s.slice(0, dot)
    const rest = dot === -1 ? '' : s.slice(dot)
    if (intPart.length >= n) return sign + intPart + rest
    return sign + intPart.padStart(n, '0') + rest
}

// ───── Thousands separator + EU format ─────
const applyThousandsAndPreset = (v: string, preset?: 'us' | 'eu' | 'in'): string => {
    let sign = ''
    let s = v
    if (s.startsWith('-')) {
        sign = '-'
        s = s.slice(1)
    } else if (s.startsWith('+')) {
        sign = '+'
        s = s.slice(1)
    }
    const dot = s.indexOf('.')
    const intPart = dot === -1 ? s : s.slice(0, dot)
    const fracPart = dot === -1 ? '' : s.slice(dot + 1)
    const grouped = applyThousands(intPart, preset)
    if (preset === 'eu') {
        // EU style: thousands separator is '.', decimal separator is ','
        const groupedEu = grouped.replace(RE_COMMA_GLOBAL, '.')
        return sign + groupedEu + (fracPart ? `,${fracPart}` : '')
    }
    return sign + grouped + (fracPart ? `.${fracPart}` : '')
}

// ───── Final decoration ─────
const finalDecorate = (v: string, opts: IFormatOpts, compactSuffix: string): string | number => {
    let s = v
    if (compactSuffix) s += compactSuffix
    if (opts.percent) s += '%'
    if (opts.asNumber) return Number(s)
    return s
}

/**
 * Formats a numeric string according to {@link IFormatOpts} (rounding, zero-padding,
 * thousands separator, compact notation, percent, etc.).
 *
 * Most callers should prefer {@link fmt}; this function accepts already-normalized flat options.
 *
 * @param value Canonical numeric string (e.g. the result of a precision arithmetic operation)
 * @param opts Formatting options produced by {@link normalizeFormat}
 * @returns Formatted result — `number` when `output: 'number'`, `string` otherwise
 */
export const formatValue = (value: string, opts: IFormatOpts): string | number => {
    let v = value

    // Clamp: constrain the value to [min, max] before any further formatting
    if (opts.clampMin !== undefined && cmp(v, opts.clampMin) < 0) v = opts.clampMin
    if (opts.clampMax !== undefined && cmp(v, opts.clampMax) > 0) v = opts.clampMax

    if (opts.percent) v = mul(v, '100')

    let compactSuffix = ''
    if (opts.compact) {
        const c = applyCompact(v, opts.compactPreset)
        v = c.num
        compactSuffix = c.suffix
    }

    if (opts.fraction) return finalDecorate(applyFraction(v), opts, compactSuffix)
    if (opts.scientific) return finalDecorate(applyScientific(v), opts, compactSuffix)

    const rounding = opts.rounding || 'truncate'
    if (opts.fixed !== undefined) {
        v = applyRounding(v, opts.fixed, rounding)
        v = padDecimals(v, opts.fixed)
    } else {
        if (opts.max !== undefined) v = applyRounding(v, opts.max, rounding)
        if (opts.min !== undefined) v = padDecimals(v, opts.min)
    }

    if (opts.intPad !== undefined) v = padIntegerZeros(v, opts.intPad)
    if (opts.thousands) v = applyThousandsAndPreset(v, opts.thousandsPreset)

    if (opts.plus && !v.startsWith('-') && !RE_ZERO_VAL.test(v)) v = `+${v}`

    return finalDecorate(v, opts, compactSuffix)
}

/**
 * Normalizes a high-level {@link IFormat} object into the internal flat options structure.
 *
 * @param format An {@link IFormat} object
 * @returns Flat {@link IFormatOpts}
 */
export const normalizeFormat = (format: IFormat | undefined): IFormatOpts => {
    if (!format) return {}
    const o: IFormatOpts = {}
    const f = format
    if (typeof f.decimals === 'number') {
        o.fixed = f.decimals
    } else if (f.decimals) {
        if (f.decimals.max !== undefined) o.max = f.decimals.max
        if (f.decimals.min !== undefined) o.min = f.decimals.min
    }
    if (f.rounding) o.rounding = ROUNDING_ALIAS[f.rounding]
    if (f.thousands) {
        o.thousands = true
        if (f.thousands !== true) o.thousandsPreset = f.thousands
    }
    if (f.compact) {
        o.compact = true
        if (f.compact !== true) o.compactPreset = f.compact
    }
    if (f.clamp) {
        o.clampMin = String(f.clamp[0])
        o.clampMax = String(f.clamp[1])
    }
    const outFlag = f.output && OUTPUT_FLAG[f.output]
    if (outFlag) o[outFlag] = true
    if (f.plus) o.plus = true
    if (f.pad !== undefined) o.intPad = f.pad
    return o
}

/** Options for {@link fmt}: formatting fields (see {@link IFormat}) plus `_`-prefixed control options */
export interface IFmtOptions extends IFormat {
    /** Error fallback value: defaults to the global `_error` (typically `'-'`). **Only `fmt` has a fallback */
    _error?: string | number
    /** Division precision used when evaluating expressions (defaults to the global `_precision`) */
    _precision?: number
    /** Enable unit mode (`%` etc., same as `calc`'s `_unit`) */
    _unit?: boolean
}

const RE_PERCENT = /%/

/**
 * Display-oriented formatting: the display counterpart of {@link calc} — same API,
 * **supports arithmetic** (the first argument may be an arithmetic expression string),
 * but **returns `_error` as a fallback on failure instead of throwing**, making it safe
 * for direct use in template rendering (e.g. `{{ fmt(`${price} * ${qty}`, { decimals: 2 }) }}`).
 *
 * - Pass a `string` ⇒ evaluate as an arithmetic expression, then format (`fmt('1 + 2 * 3')` ⇒ `'7'`)
 * - Pass a `number` / `bigint` ⇒ format directly
 * - On error (invalid expression, etc.) ⇒ return the `_error` fallback
 *   (local `options._error` takes precedence over the global default `'-'`)
 *
 * @returns Formatted result; the `_error` fallback value on failure
 * @example
 * fmt(1234.5, { decimals: 2, thousands: true }) // '1,234.50'
 * fmt('999.99 * 3', { decimals: 2 })            // '2,999.97' (evaluate first, then format)
 * fmt('bad expr')                               // '-' (fallback, does not throw)
 */
export function fmtWith(cfg: IGlobalConfig, value: string | number | bigint, options?: IFmtOptions): string | number {
    try {
        const v = typeof value === 'string'
            ? evaluate(value, { unit: !!options?._unit, precision: options?._precision ?? cfg._precision, trace: undefined })
            : fmtDecimal(parse(value))
        const opts = normalizeFormat(options)
        const out = formatValue(v, opts)
        // Unit mode: if the expression contains % and no explicit output form is set, append % to the result
        if (typeof value === 'string' && options?._unit && RE_PERCENT.test(value) && typeof out === 'string'
            && !opts.percent && !opts.fraction && !opts.scientific && !opts.asNumber) {
            return `${out}%`
        }
        return out
    } catch {
        // Fallback: local _error takes precedence; otherwise use the global _error (default '-')
        return options?._error !== undefined ? options._error : cfg._error
    }
}

export const fmt = (value: string | number | bigint, options?: IFmtOptions): string | number => fmtWith(getConfig(), value, options)
