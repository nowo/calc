// Precision math: internally represents decimal numbers using BigInt
// A number = sign * digits / 10^exp   (exp >= 0 denotes the number of decimal places)

/** Internal decimal representation: a number = `sign * digits / 10^exp` */
export interface IDecimal {
    /** Sign: `1` for positive, `-1` for negative. */
    sign: 1 | -1
    /** Significant digits as a non-negative integer (decimal point removed). */
    digits: bigint
    /** Number of decimal places (negative exponent of `10`). */
    exp: number
}

const TEN = 10n

// Cache powers of 10 to avoid repeatedly constructing large BigInts like 10^precision in division
// (inspired by decimal.js's "precompute constants, no recomputation" approach; grows on demand, reused across calls)
const POW10: bigint[] = [1n]
const pow10 = (n: number): bigint => {
    for (let i = POW10.length; i <= n; i++) POW10[i] = POW10[i - 1]! * TEN
    return POW10[n]!
}

// ───── Module-level constant regexes ─────
const RE_SCI = /^([+-]?\d+(?:\.\d+)?)e([+-]?\d+)$/i
const RE_NUM = /^\d+(?:\.\d+)?$/
const RE_TRAIL_ZERO = /0+$/

/** Shifts the decimal point of `"1.23"` left or right by `n` positions → string. */
const shiftDecimalPoint = (s: string, n: number): string => {
    let sign = ''
    if (s.startsWith('-')) {
        sign = '-'
        s = s.slice(1)
    } else if (s.startsWith('+')) {
        s = s.slice(1)
    }
    const dot = s.indexOf('.')
    const allDigits = dot === -1 ? s : s.slice(0, dot) + s.slice(dot + 1)
    const dotPos = (dot === -1 ? s.length : dot) + n
    if (dotPos <= 0) return `${sign}0.${'0'.repeat(-dotPos)}${allDigits}`
    if (dotPos >= allDigits.length) return sign + allDigits + '0'.repeat(dotPos - allDigits.length)
    return `${sign}${allDigits.slice(0, dotPos)}.${allDigits.slice(dotPos)}`
}

/**
 * Parses a string, number, or bigint into the internal {@link IDecimal} representation.
 *
 * Supports standard decimals (`"1.23"`, `-0.5`) and scientific notation (`"1.2e-3"`).
 *
 * @param input Value to parse, e.g. `"3.14"`, `42`, `-1n`, `"1e10"`
 * @returns Parsed {@link IDecimal} (`digits` is always >= 0; sign is carried by `sign`)
 * @throws When the string is not a valid number
 * @example
 * parse('1.23') // { sign: 1, digits: 123n, exp: 2 }
 * parse('-5')   // { sign: -1, digits: 5n, exp: 0 }
 */
export const parse = (input: string | number | bigint): IDecimal => {
    if (typeof input === 'bigint') return { sign: input < 0n ? -1 : 1, digits: input < 0n ? -input : input, exp: 0 }
    let s = String(input).trim()
    if (s === '' || s === '-' || s === '+') throw new Error(`Cannot parse number: "${input}"`)
    const expMatch = RE_SCI.exec(s)
    if (expMatch) {
        const base = expMatch[1]!
        const e = Number.parseInt(expMatch[2]!, 10)
        s = shiftDecimalPoint(base, e)
    }
    let sign: 1 | -1 = 1
    if (s.startsWith('+')) {
        s = s.slice(1)
    } else if (s.startsWith('-')) {
        sign = -1
        s = s.slice(1)
    }
    if (!RE_NUM.test(s)) throw new Error(`Cannot parse number: "${input}"`)
    const dot = s.indexOf('.')
    const digitStr = dot === -1 ? s : s.slice(0, dot) + s.slice(dot + 1)
    const exp = dot === -1 ? 0 : s.length - dot - 1
    const digits = BigInt(digitStr || '0')
    if (digits === 0n) return { sign: 1, digits: 0n, exp: 0 }
    return { sign, digits, exp }
}

/**
 * Converts an {@link IDecimal} back to a canonical decimal string (trailing zeros are stripped automatically).
 *
 * @param d The {@link IDecimal} to format
 * @returns Canonical string; zero is always returned as `"0"`
 * @example
 * format({ sign: 1, digits: 1230n, exp: 3 }) // '1.23'
 */
export const format = (d: IDecimal): string => {
    if (d.digits === 0n) return '0'
    let raw = d.digits.toString()
    if (d.exp > 0) {
        if (raw.length <= d.exp) raw = '0'.repeat(d.exp - raw.length + 1) + raw
        const intPart = raw.slice(0, raw.length - d.exp)
        const fracPart = raw.slice(raw.length - d.exp).replace(RE_TRAIL_ZERO, '')
        raw = fracPart ? `${intPart}.${fracPart}` : intPart
    }
    return (d.sign < 0 ? '-' : '') + raw
}

/** Aligns the digits of two numbers to the same exp (using the larger of the two). */
const align = (a: IDecimal, b: IDecimal): { aN: bigint, bN: bigint, exp: number } => {
    if (a.exp === b.exp) return { aN: a.digits, bN: b.digits, exp: a.exp }
    if (a.exp > b.exp) return { aN: a.digits, bN: b.digits * TEN ** BigInt(a.exp - b.exp), exp: a.exp }
    return { aN: a.digits * TEN ** BigInt(b.exp - a.exp), bN: b.digits, exp: b.exp }
}

const fromBig = (n: bigint, exp: number): IDecimal => {
    if (n === 0n) return { sign: 1, digits: 0n, exp: 0 }
    return { sign: n < 0n ? -1 : 1, digits: n < 0n ? -n : n, exp }
}

// ───── Fast path using integer-scaled numbers ─────
// When both operands can be represented as safe integer mantissas (value within 2^53, decimal places <= 15),
// use integer arithmetic on `number` for near-native speed; otherwise return null and fall back to the BigInt implementation below.
// Critical: scaling is done only as "integer × 10^k" — never multiply by a floating-point decimal (e.g. 0.29 * 100 = 28.999… would be wrong).
const MAX_SAFE = Number.MAX_SAFE_INTEGER
const POW10F = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15]

interface IFastNum {
    /** Safe integer mantissa (with sign). */
    int: number
    /** Number of decimal places; actual value = int / 10^scale. */
    scale: number
}

/** Parses input into `int / 10^scale` (int is a safe integer); returns `null` when safe representation is not possible, signalling the caller to fall back. */
const parseFast = (input: string | number | bigint): IFastNum | null => {
    const s = typeof input === 'string' ? input : String(input)
    let i = 0
    let neg = false
    const c0 = s.charCodeAt(0)
    if (c0 === 45) { // '-'
        neg = true
        i = 1
    } else if (c0 === 43) { // '+'
        i = 1
    }
    let hasDot = false
    let scale = 0
    let digits = ''
    for (; i < s.length; i++) {
        const c = s.charCodeAt(i)
        if (c === 46) { // '.'
            if (hasDot || digits === '') return null // multiple dots or no integer part (".5") → fall back to strict parse
            hasDot = true
        } else if (c >= 48 && c <= 57) { // '0'..'9'
            digits += s[i]
            if (hasDot) scale++
        } else {
            return null // 'e' (scientific notation), whitespace, or illegal character → fall back
        }
    }
    if (digits === '' || (hasDot && scale === 0)) return null // empty or trailing dot ("1.") → fall back
    if (digits.length > 15 || scale >= POW10F.length) return null // exceeds safe integer range or too many decimal places → fall back
    const int = Number(digits)
    return { int: neg ? -int : int, scale }
}

/** Formats `int / 10^scale` as a canonical string, output identical to {@link format} (trailing zeros stripped, zero returns `'0'`). */
const fmtIntFast = (int: number, scale: number): string => {
    if (int === 0) return '0'
    const neg = int < 0
    let s = (neg ? -int : int).toString()
    if (scale === 0) return neg ? `-${s}` : s
    if (s.length <= scale) s = '0'.repeat(scale - s.length + 1) + s
    const cut = s.length - scale
    let end = s.length
    while (end > cut && s.charCodeAt(end - 1) === 48) end-- // strip trailing zeros
    const out = end === cut ? s.slice(0, cut) : `${s.slice(0, cut)}.${s.slice(cut, end)}`
    return neg ? `-${out}` : out
}

/** Fast path for addition/subtraction: `op` is `1` (add) or `-1` (subtract); returns `null` when unavailable. */
const fastAddSub = (a: string | number | bigint, b: string | number | bigint, op: 1 | -1): string | null => {
    const pa = parseFast(a)
    if (pa === null) return null
    const pb = parseFast(b)
    if (pb === null) return null
    const scale = pa.scale > pb.scale ? pa.scale : pb.scale
    const ia = pa.int * POW10F[scale - pa.scale]!
    const ib = pb.int * POW10F[scale - pb.scale]!
    if (ia > MAX_SAFE || ia < -MAX_SAFE || ib > MAX_SAFE || ib < -MAX_SAFE) return null
    const r = ia + op * ib
    if (r > MAX_SAFE || r < -MAX_SAFE) return null
    return fmtIntFast(r, scale)
}

/** Fast path for multiplication; returns `null` when unavailable. */
const fastMul = (a: string | number | bigint, b: string | number | bigint): string | null => {
    const pa = parseFast(a)
    if (pa === null) return null
    const pb = parseFast(b)
    if (pb === null) return null
    const r = pa.int * pb.int
    if (r > MAX_SAFE || r < -MAX_SAFE) return null
    return fmtIntFast(r, pa.scale + pb.scale)
}

// ───── Public arithmetic ─────
/**
 * High-precision addition `a + b`, computed entirely with BigInt — no floating-point errors.
 *
 * @param a Augend
 * @param b Addend
 * @returns Canonical string of the sum
 * @example
 * add('0.1', '0.2') // '0.3'
 */
export const add = (a: string | number | bigint, b: string | number | bigint): string => {
    const fast = fastAddSub(a, b, 1)
    if (fast !== null) return fast
    const da = parse(a)
    const db = parse(b)
    const { aN, bN, exp } = align(da, db)
    const r = BigInt(da.sign) * aN + BigInt(db.sign) * bN
    return format(fromBig(r, exp))
}

/**
 * High-precision subtraction `a - b`.
 *
 * @param a Minuend
 * @param b Subtrahend
 * @returns Canonical string of the difference
 * @example
 * sub('0.3', '0.1') // '0.2'
 */
export const sub = (a: string | number | bigint, b: string | number | bigint): string => {
    const fast = fastAddSub(a, b, -1)
    if (fast !== null) return fast
    const da = parse(a)
    const db = parse(b)
    const { aN, bN, exp } = align(da, db)
    const r = BigInt(da.sign) * aN - BigInt(db.sign) * bN
    return format(fromBig(r, exp))
}

/**
 * High-precision multiplication `a * b`.
 *
 * @param a Factor
 * @param b Factor
 * @returns Canonical string of the product
 * @example
 * mul('0.1', '0.2') // '0.02'
 */
export const mul = (a: string | number | bigint, b: string | number | bigint): string => {
    const fast = fastMul(a, b)
    if (fast !== null) return fast
    const da = parse(a)
    const db = parse(b)
    const sign = (da.sign * db.sign) as 1 | -1
    const digits = da.digits * db.digits
    const exp = da.exp + db.exp
    if (digits === 0n) return '0'
    return format({ sign, digits, exp })
}

/**
 * High-precision division `a / b`, result rounded to `precision` decimal places (half-up).
 *
 * @param a Dividend
 * @param b Divisor
 * @param precision Maximum decimal places to retain, defaults to `50`
 * @returns Canonical string of the quotient
 * @throws When the divisor is zero
 * @example
 * div('1', '3')      // '0.333...' (up to 50 places)
 * div('1', '3', 4)   // '0.3333'
 */
export const div = (a: string | number | bigint, b: string | number | bigint, precision: number = 50): string => {
    const da = parse(a)
    const db = parse(b)
    if (db.digits === 0n) throw new Error('Division by zero')
    if (da.digits === 0n) return '0'
    const sign = (da.sign * db.sign) as 1 | -1
    // Let result = a / b = (da.digits * 10^-da.exp) / (db.digits * 10^-db.exp)
    //                    = (da.digits / db.digits) * 10^(db.exp - da.exp)
    // Fast path: if the division is exact the result is a finite decimal; return it directly
    // without scaling to precision+1 digits and doing large-integer division + rounding
    // (analogous to decimal.js "early exit when remainder is zero")
    if (da.digits % db.digits === 0n) {
        const q = da.digits / db.digits
        const e = da.exp - db.exp // result = q * 10^(-e)
        const d: IDecimal = e >= 0 ? { sign, digits: q, exp: e } : { sign, digits: q * pow10(-e), exp: 0 }
        return format(d)
    }
    // We want q = result * 10^(precision + 1)  ⇒ shift = precision + 1 + db.exp - da.exp
    const shift = precision + 1 + db.exp - da.exp
    let num = da.digits
    let den = db.digits
    if (shift >= 0) num = num * pow10(shift)
    else den = den * pow10(-shift)
    const q = num / den
    // q now represents result * 10^(precision+1); inspect the last digit to apply rounding
    const rounded = q % TEN >= 5n ? q / TEN + 1n : q / TEN
    return format(fromBig(sign === 1 ? rounded : -rounded, precision))
}

// ───── Utilities ─────
/**
 * Compares two numbers numerically.
 *
 * @param a Left operand
 * @param b Right operand
 * @returns `1` if `a > b`, `-1` if `a < b`, `0` if equal
 * @example
 * cmp('0.1', '0.2') // -1
 * cmp('2', '2.0')   // 0
 */
export const cmp = (a: string | number | bigint, b: string | number | bigint): number => {
    const da = parse(a)
    const db = parse(b)
    if (da.digits === 0n && db.digits === 0n) return 0
    if (da.sign !== db.sign) return da.sign < db.sign ? -1 : 1
    const { aN, bN } = align(da, db)
    if (aN === bN) return 0
    const signed = da.sign === 1 ? (aN > bN ? 1 : -1) : (aN > bN ? -1 : 1)
    return signed
}

/**
 * Returns the negation `-a`.
 *
 * @param a Input value
 * @returns Canonical string of the negation (`0` always returns `'0'`)
 * @example
 * neg('1.5')  // '-1.5'
 * neg('-2')   // '2'
 */
export const neg = (a: string | number | bigint): string => {
    const d = parse(a)
    if (d.digits === 0n) return '0'
    return format({ ...d, sign: -d.sign as 1 | -1 })
}

/**
 * Returns the absolute value `|a|`.
 *
 * @param a Input value
 * @returns Canonical string of the absolute value
 * @example
 * abs('-3.14') // '3.14'
 */
export const abs = (a: string | number | bigint): string => {
    const d = parse(a)
    return format({ ...d, sign: 1 })
}

/**
 * Truncates to N decimal places by discarding excess digits — **no rounding**.
 *
 * @param a Input value
 * @param decimals Number of decimal places to keep
 * @returns Canonical string after truncation
 * @example
 * truncate('1.2349', 2) // '1.23'
 * truncate('1.99', 0)   // '1'
 */
export const truncate = (a: string | number | bigint, decimals: number): string => {
    const d = parse(a)
    if (d.exp <= decimals) return format(d)
    const drop = d.exp - decimals
    const newDigits = d.digits / TEN ** BigInt(drop)
    if (newDigits === 0n) return '0'
    return format({ sign: d.sign, digits: newDigits, exp: decimals })
}

/**
 * Rounds to N decimal places using half-up rounding (rounds up when digit `>= 0.5`).
 *
 * @param a Input value
 * @param decimals Number of decimal places to keep
 * @returns Canonical string after rounding
 * @example
 * roundHalfUp('1.235', 2) // '1.24'
 * roundHalfUp('1.234', 2) // '1.23'
 */
export const roundHalfUp = (a: string | number | bigint, decimals: number): string => {
    const d = parse(a)
    if (d.exp <= decimals) return format(d)
    const drop = d.exp - decimals
    const divisor = TEN ** BigInt(drop)
    const halved = TEN ** BigInt(drop - 1) * 5n
    const remainder = d.digits % divisor
    let q = d.digits / divisor
    if (remainder >= halved) q += 1n
    if (q === 0n) return '0'
    return format({ sign: d.sign, digits: q, exp: decimals })
}

/**
 * Rounds toward `+∞` to N decimal places (same as `Math.ceil`): positive values round up,
 * negative values round toward zero.
 *
 * @param a Input value
 * @param decimals Number of decimal places to keep
 * @returns Canonical string after rounding
 * @example
 * roundCeil('1.231', 2)  // '1.24'
 * roundCeil('-1.231', 2) // '-1.23' (toward +∞)
 */
export const roundCeil = (a: string | number | bigint, decimals: number): string => {
    const d = parse(a)
    if (d.exp <= decimals) return format(d)
    const drop = d.exp - decimals
    const divisor = TEN ** BigInt(drop)
    const remainder = d.digits % divisor
    let q = d.digits / divisor
    if (remainder !== 0n && d.sign > 0) q += 1n // only positive magnitudes grow toward +∞
    if (q === 0n) return '0'
    return format({ sign: d.sign, digits: q, exp: decimals })
}

/**
 * Rounds toward `-∞` to N decimal places (same as `Math.floor`): positive values round toward zero,
 * negative values round away from zero.
 *
 * @param a Input value
 * @param decimals Number of decimal places to keep
 * @returns Canonical string after rounding
 * @example
 * roundFloor('1.239', 2)  // '1.23'
 * roundFloor('-1.231', 2) // '-1.24' (toward -∞)
 */
export const roundFloor = (a: string | number | bigint, decimals: number): string => {
    const d = parse(a)
    if (d.exp <= decimals) return format(d)
    const drop = d.exp - decimals
    const divisor = TEN ** BigInt(drop)
    const remainder = d.digits % divisor
    let q = d.digits / divisor
    if (remainder !== 0n && d.sign < 0) q += 1n // only negative magnitudes grow toward -∞
    if (q === 0n) return '0'
    return format({ sign: d.sign, digits: q, exp: decimals })
}

/**
 * Rounds away from zero to N decimal places (rounds up whenever there is any remainder, ignoring sign).
 *
 * @param a Input value
 * @param decimals Number of decimal places to keep
 * @returns Canonical string after rounding
 * @example
 * roundExpand('1.231', 2)  // '1.24'
 * roundExpand('-1.231', 2) // '-1.24'
 */
export const roundExpand = (a: string | number | bigint, decimals: number): string => {
    const d = parse(a)
    if (d.exp <= decimals) return format(d)
    const drop = d.exp - decimals
    const divisor = TEN ** BigInt(drop)
    const remainder = d.digits % divisor
    let q = d.digits / divisor
    if (remainder !== 0n) q += 1n
    if (q === 0n) return '0'
    return format({ sign: d.sign, digits: q, exp: decimals })
}

/**
 * Banker's rounding (round half to even): when the discarded portion is exactly `0.5`,
 * rounds to the nearest even digit.
 *
 * @param a Input value
 * @param decimals Number of decimal places to keep
 * @returns Canonical string after rounding
 * @example
 * roundBanker('0.5', 0)  // '0'
 * roundBanker('1.5', 0)  // '2'
 * roundBanker('2.5', 0)  // '2'
 */
export const roundBanker = (a: string | number | bigint, decimals: number): string => {
    const d = parse(a)
    if (d.exp <= decimals) return format(d)
    const drop = d.exp - decimals
    const divisor = TEN ** BigInt(drop)
    const halved = TEN ** BigInt(drop - 1) * 5n
    const remainder = d.digits % divisor
    let q = d.digits / divisor
    if (remainder > halved) q += 1n
    else if (remainder === halved && q % 2n === 1n) q += 1n
    if (q === 0n) return '0'
    return format({ sign: d.sign, digits: q, exp: decimals })
}

// ───── Higher-order operations ─────
/** Integer square root of a non-negative BigInt (floor), via Newton's method. */
const isqrt = (value: bigint): bigint => {
    if (value < 2n) return value
    let x = value
    let y = (x + 1n) / 2n
    while (y < x) {
        x = y
        y = (x + value / x) / 2n
    }
    return x
}

/**
 * High-precision square root `√a`, result rounded to `precision` decimal places (half-up).
 *
 * Computed entirely with BigInt integer square root — no floating-point error. Perfect squares
 * return exact integers; irrational roots are truncated/rounded to `precision` places.
 *
 * @param a Radicand (must be `>= 0`)
 * @param precision Maximum decimal places to retain, defaults to `50`
 * @returns Canonical string of the square root
 * @throws When `a` is negative
 * @example
 * sqrt('4')     // '2'
 * sqrt('2', 6)  // '1.414214'
 */
export const sqrt = (a: string | number | bigint, precision: number = 50): string => {
    const d = parse(a)
    if (d.sign < 0) throw new Error(`Cannot take the square root of a negative number: "${a}"`)
    if (d.digits === 0n) return '0'
    // √(digits·10^-exp)·10^(precision+1) = √(digits·10^(2·(precision+1) - exp))
    const p1 = precision + 1
    const k = 2 * p1 - d.exp
    const m = k >= 0 ? d.digits * pow10(k) : d.digits / pow10(-k)
    const s = isqrt(m) // ≈ √a · 10^(precision+1); inspect last digit to round to `precision`
    const rounded = s % TEN >= 5n ? s / TEN + 1n : s / TEN
    return format(fromBig(rounded, precision))
}

/**
 * High-precision integer-exponent power `a ^ n`.
 *
 * The exponent must be an integer (fractional exponents are not supported). Positive exponents
 * are exact (repeated multiplication); negative exponents divide and are rounded to `precision`.
 *
 * @param base Base value
 * @param exponent Integer exponent (may be negative)
 * @param precision Decimal places for the reciprocal when the exponent is negative, defaults to `50`
 * @returns Canonical string of the power
 * @throws When the exponent is not an integer
 * @example
 * pow('2', 10)   // '1024'
 * pow('2', -1)   // '0.5'
 */
export const pow = (base: string | number | bigint, exponent: string | number | bigint, precision: number = 50): string => {
    const e = Number(exponent)
    if (!Number.isInteger(e)) throw new Error(`pow() exponent must be an integer: "${exponent}"`)
    const b = String(base)
    let r = '1'
    for (let i = 0; i < Math.abs(e); i++) r = mul(r, b)
    return e < 0 ? div('1', r, precision) : r
}

/**
 * Modulo `a % b` — the remainder carries the sign of the dividend (same as JS `%`). Exact, no rounding.
 *
 * @param a Dividend
 * @param b Divisor
 * @returns Canonical string of the remainder
 * @throws When the divisor is zero
 * @example
 * mod('10', '3')  // '1'
 * mod('-7', '3')  // '-1'
 */
export const mod = (a: string | number | bigint, b: string | number | bigint): string => {
    const da = parse(a)
    const db = parse(b)
    if (db.digits === 0n) throw new Error('mod division by zero')
    if (da.digits === 0n) return '0'
    const { aN, bN, exp } = align(da, db)
    const sa = BigInt(da.sign) * aN
    const sb = BigInt(db.sign) * bN
    const r = sa - (sa / sb) * sb // BigInt division truncates toward zero ⇒ remainder follows dividend sign
    return format(fromBig(r, exp))
}
