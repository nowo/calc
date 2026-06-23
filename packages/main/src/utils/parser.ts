// Expression parsing + evaluation (pure arithmetic: four operations + parentheses + math functions;
// variables are not supported — embed values via template interpolation)
// Grammar (lowest → highest precedence):
//   addSub  := mulDiv (('+' | '-') mulDiv)*
//   mulDiv  := unary (('*' | '/') unary)*
//   unary   := ('+' | '-')? primary
//   primary := NUMBER | IDENT | FN '(' args ')' | '(' addSub ')'

import { abs, add, cmp, div, mod, mul, neg, pow, sqrt, sub, truncate } from './precision'

// ───── Tokenizer ─────
type TokenType
    = | 'NUMBER' | 'IDENT' | 'UNIT'
        | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH'
        | 'LPAREN' | 'RPAREN' | 'COMMA'
        | 'EOF'

interface IToken { type: TokenType, value: string, pos: number }

const RE_WS = /\s/
const RE_DIGIT = /\d/
const RE_NUM_BODY = /[\d.]/
// CJK Unified Ideographs range: U+4E00 ~ U+9FA5 (explicit unicode escapes to satisfy lint "obscure range")
const RE_IDENT_START = /[a-z_$\u4E00-\u9FA5]/i
const RE_IDENT_BODY = /[\w$\u4E00-\u9FA5]/

const SINGLE_OPS: Record<string, TokenType> = {
    '+': 'PLUS',
    '-': 'MINUS',
    '*': 'STAR',
    '/': 'SLASH',
    '(': 'LPAREN',
    ')': 'RPAREN',
    ',': 'COMMA',
}

const tokenize = (input: string): IToken[] => {
    const tokens: IToken[] = []
    let i = 0
    while (i < input.length) {
        const c = input[i]!
        if (RE_WS.test(c)) {
            i++
            continue
        }
        // Number (including decimal / scientific notation)
        if (RE_DIGIT.test(c) || (c === '.' && RE_DIGIT.test(input[i + 1] || ''))) {
            const start = i
            while (i < input.length && RE_NUM_BODY.test(input[i]!)) i++
            if (input[i] === 'e' || input[i] === 'E') {
                i++
                if (input[i] === '+' || input[i] === '-') i++
                while (i < input.length && RE_DIGIT.test(input[i]!)) i++
            }
            tokens.push({ type: 'NUMBER', value: input.slice(start, i), pos: start })
            // Trailing unit: lone % ⇒ UNIT token (exclude %% which is a format token)
            if (input[i] === '%' && input[i + 1] !== '%') {
                tokens.push({ type: 'UNIT', value: '%', pos: i })
                i++
            }
            continue
        }
        // Identifier (math function names such as max / min / clamp)
        if (RE_IDENT_START.test(c)) {
            const start = i
            i++
            while (i < input.length && RE_IDENT_BODY.test(input[i]!)) i++
            tokens.push({ type: 'IDENT', value: input.slice(start, i), pos: start })
            continue
        }
        // Single-character operators
        if (c in SINGLE_OPS) {
            tokens.push({ type: SINGLE_OPS[c]!, value: c, pos: i })
            i++
            continue
        }
        throw new Error(`Illegal character at position ${i}: "${c}"`)
    }
    tokens.push({ type: 'EOF', value: '', pos: input.length })
    return tokens
}

// ───── Evaluation context ─────
/** Evaluation context for {@link evaluate} */
export interface IEvalContext {
    /** Unit mode: when `true`, `%` is treated as a unit marker rather than division by 100 */
    unit: boolean
    /** Maximum decimal places to retain in division */
    precision: number
    /** When an array is provided, evaluation steps are recorded into it (used by `_debug`) */
    trace?: string[]
}

// ───── Built-in math functions (all use BigInt precision primitives for exact results) ─────
/** Floor (toward -∞, same as Math.floor) */
const mathFloor = (x: string): string => {
    const t = truncate(x, 0)
    return (cmp(x, '0') < 0 && cmp(x, t) !== 0) ? sub(t, '1') : t
}
/** Ceiling (toward +∞, same as Math.ceil) */
const mathCeil = (x: string): string => {
    const t = truncate(x, 0)
    return (cmp(x, '0') > 0 && cmp(x, t) !== 0) ? add(t, '1') : t
}
/** Sign: -1 / 0 / 1 */
const mathSign = (x: string): string => {
    const c = cmp(x, '0')
    return c > 0 ? '1' : c < 0 ? '-1' : '0'
}
/** Pick a value from args by comparison (used for min / max) */
const pickBy = (name: string, args: string[], keep: (c: number) => boolean): string => {
    if (args.length === 0) throw new Error(`${name}() requires at least 1 argument`)
    let r = args[0]!
    for (let i = 1; i < args.length; i++) if (keep(cmp(args[i]!, r))) r = args[i]!
    return r
}

// Fixed arity for each function (min/max are variadic and not in this table)
const FN_ARITY: Record<string, number> = {
    abs: 1,
    sign: 1,
    floor: 1,
    ceil: 1,
    round: 1,
    trunc: 1,
    sqrt: 1,
    pow: 2,
    mod: 2,
    clamp: 3,
}

/** Built-in functions (available inside expressions) */
const applyFn = (name: string, args: string[], precision: number): string => {
    const arity = FN_ARITY[name]
    if (arity !== undefined && args.length !== arity) {
        throw new Error(`${name}() expects ${arity} argument(s), got ${args.length}`)
    }
    switch (name) {
        case 'abs':
            return abs(args[0]!)
        case 'sign':
            return mathSign(args[0]!)
        case 'floor':
            return mathFloor(args[0]!)
        case 'ceil':
            return mathCeil(args[0]!)
        case 'round':
            return mathFloor(add(args[0]!, '0.5')) // same as Math.round (half rounds toward +∞)
        case 'trunc':
            return truncate(args[0]!, 0)
        case 'sqrt':
            return sqrt(args[0]!, precision)
        case 'pow':
            return pow(args[0]!, args[1]!, precision)
        case 'mod':
            return mod(args[0]!, args[1]!)
        case 'min':
            return pickBy('min', args, c => c < 0)
        case 'max':
            return pickBy('max', args, c => c > 0)
        case 'clamp': {
            const [x, lo, hi] = args as [string, string, string]
            if (cmp(x, lo) < 0) return lo
            if (cmp(x, hi) > 0) return hi
            return x
        }
        default:
            throw new Error(`Unknown function: "${name}()"`)
    }
}

// ───── Parser + evaluator ─────
class Parser {
    private tokens: IToken[]
    private pos = 0

    constructor(input: string, private ctx: IEvalContext) {
        this.tokens = tokenize(input)
    }

    private peek(): IToken { return this.tokens[this.pos]! }
    private consume(): IToken { return this.tokens[this.pos++]! }
    private match(...types: TokenType[]): IToken | null {
        if (types.includes(this.peek().type)) return this.consume()
        return null
    }

    private expect(type: TokenType): IToken {
        const t = this.peek()
        if (t.type !== type) throw new Error(`Expected ${type} at position ${t.pos}, got ${t.type}("${t.value}")`)
        return this.consume()
    }

    private step(line: string): void {
        if (this.ctx.trace) this.ctx.trace.push(line)
    }

    public parse(): string {
        const v = this.addSub()
        if (this.peek().type !== 'EOF') {
            const t = this.peek()
            throw new Error(`Unexpected token "${t.value}" at position ${t.pos} — expression not fully parsed`)
        }
        return v
    }

    private addSub(): string {
        let left = this.mulDiv()
        while (true) {
            const op = this.match('PLUS', 'MINUS')
            if (!op) break
            const right = this.mulDiv()
            const prev = left
            left = op.type === 'PLUS' ? add(left, right) : sub(left, right)
            this.step(`${prev} ${op.value} ${right} = ${left}`)
        }
        return left
    }

    private mulDiv(): string {
        let left = this.unary()
        while (true) {
            const op = this.match('STAR', 'SLASH')
            if (!op) break
            const right = this.unary()
            const prev = left
            left = op.type === 'STAR' ? mul(left, right) : div(left, right, this.ctx.precision)
            this.step(`${prev} ${op.value} ${right} = ${left}`)
        }
        return left
    }

    private unary(): string {
        if (this.match('PLUS')) return this.unary()
        if (this.match('MINUS')) return neg(this.unary())
        return this.primary()
    }

    private primary(): string {
        const t = this.peek()
        if (t.type === 'NUMBER') {
            this.consume()
            const val = t.value
            if (this.peek().type === 'UNIT') {
                const u = this.consume()
                if (u.value === '%') {
                    // _unit=true ⇒ % is a unit marker; value is kept as-is (output layer appends %)
                    // _unit=false ⇒ % means divide by 100
                    if (this.ctx.unit) return val
                    return div(val, '100', this.ctx.precision)
                }
            }
            return val
        }
        if (t.type === 'IDENT') {
            this.consume()
            // Identifiers can only be math function names (followed by parentheses); variables are not supported — use template interpolation
            if (this.peek().type === 'LPAREN') return this.callFn(t.value)
            throw new Error(`Unknown identifier: "${t.value}" (calc supports arithmetic and math functions only; use template interpolation for values)`)
        }
        if (t.type === 'LPAREN') {
            this.consume()
            const v = this.addSub()
            this.expect('RPAREN')
            return v
        }
        throw new Error(`Unexpected token at position ${t.pos}: ${t.type}("${t.value}")`)
    }

    private callFn(name: string): string {
        this.expect('LPAREN')
        const args: string[] = []
        if (this.peek().type !== 'RPAREN') {
            args.push(this.addSub())
            while (this.match('COMMA')) args.push(this.addSub())
        }
        this.expect('RPAREN')
        const r = applyFn(name, args, this.ctx.precision)
        this.step(`${name}(${args.join(', ')}) = ${r}`)
        return r
    }
}

/**
 * Parse and evaluate an expression (the pure arithmetic part, without any format pipeline).
 *
 * Most callers should use {@link calc}; this is the low-level evaluator for cases where
 * direct control over the evaluation context is needed.
 *
 * @param expr Pure expression string (no format pipe)
 * @param ctx Evaluation context: unit mode flag and division precision
 * @returns Canonical string representation of the evaluated result
 * @throws Throws on lexical or syntax errors
 * @example
 * evaluate('1 + 2', { unit: false, precision: 50 }) // '3'
 */
export const evaluate = (expr: string, ctx: IEvalContext): string => {
    return new Parser(expr, ctx).parse()
}
