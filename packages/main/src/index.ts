// @wzo/calc — precision math + number formatting
// Zero runtime dependencies; all precision arithmetic uses BigInt internally

export { calcAvg, calcMax, calcMin, calcSum } from './utils/aggregate'
export { calc, fmt } from './utils/calc'

export type { ICalcOptions, IDebugInfo } from './utils/calc'
export { chainAdd, chainDiv, chainMul, chainSub } from './utils/chain'

export type { IChain } from './utils/chain'
export { getConfig, resetConfig, setConfig } from './utils/config'

export type { IGlobalConfig, IPrecisionOption } from './utils/config'

export type { IFmtOptions, IFormat, Rounding } from './utils/format'

// Advanced usage: direct access to precision primitives
export {
    abs,
    cmp,
    neg,
    parse,
    div as rawDiv, // division with explicit precision parameter (for add/sub/mul use addStr/subStr/mulStr)
    roundBanker,
    roundCeil,
    roundHalfUp,
    truncate,
} from './utils/precision'

export type { IDecimal } from './utils/precision'
export { add, addStr, div, divStr, mul, mulStr, sub, subStr } from './utils/standalone'
