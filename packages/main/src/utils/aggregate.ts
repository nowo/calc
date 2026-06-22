// Aggregation: calcSum / calcAvg / calcMax / calcMin
// Usage: calcSum("price", [{ price: 10 }, { price: 20 }]) → "30"
//        calcSum([1, 2, 3]) → "6"  (direct array form)

import type { IGlobalConfig, IPrecisionOption } from './config'
import { configWithPrecision } from './config'
import { add as addStr, cmp, div as divStr } from './precision'

type Val = string | number | bigint
// Values may be null / undefined: backends often return null/undefined values; pickValues skips them (the type reflects this design)
type Item = Record<string, Val | null | undefined>

const pickValues = (keyOrArr: string | Val[], list?: Item[]): string[] => {
    let raw: Array<Val | null | undefined>
    if (Array.isArray(keyOrArr)) {
        raw = keyOrArr
    } else {
        if (!list) throw new Error('list is required when keyOrArr is a field name')
        raw = list.map(item => item[keyOrArr])
    }
    // Skip null / undefined (backends often return empty values) to avoid parse errors from String(null)
    return raw.filter(v => v != null).map(v => String(v))
}

/** Internal sum core — invalid values throw and propagate to the caller. */
const sumOf = (values: string[]): string => {
    if (values.length === 0) return '0'
    let sum = values[0]!
    for (let i = 1; i < values.length; i++) sum = addStr(sum, values[i]!)
    return sum
}

/**
 * Computes the sum. Accepts two call forms: a direct value array, or a field name with an array of objects.
 *
 * @param keyOrArr Value array (`[1, 2, 3]`) or the field name to sum (`'price'`)
 * @param list Array of objects, required when the first argument is a field name
 * @returns Total sum (`string`, high precision)
 * @example
 * calcSum([1, 2, 3])                              // '6'
 * calcSum('price', [{ price: 10 }, { price: 20 }]) // '30'
 */
export const calcSum = (keyOrArr: string | Val[], list?: Item[]): string => sumOf(pickValues(keyOrArr, list))

/** Computes the average with the given config precision (shared by the default {@link calcAvg} export and per-call precision entry points). */
export const calcAvgWith = (cfg: IGlobalConfig, keyOrArr: string | Val[], list?: Item[]): string => {
    const values = pickValues(keyOrArr, list)
    if (values.length === 0) return '0'
    return divStr(sumOf(values), String(values.length), cfg._precision)
}

/**
 * Computes the average (sum / count). Returns `'0'` for an empty collection.
 *
 * Precision defaults to the global `_precision`; pass `{ _precision }` as the **last** argument
 * to override it for this call only (does not affect the global config).
 *
 * The first argument is either a value array (`[1,2,3]`) or a field name (`'price'`
 * used together with an array of objects as the second argument).
 *
 * @returns Average value (`string`)
 * @example
 * calcAvg([1, 2, 3])                               // '2'
 * calcAvg('score', [{ score: 80 }, { score: 90 }]) // '85'
 * calcAvg([10, 20, 25], { _precision: 2 })         // '18.33'
 */
export function calcAvg(arr: Val[], opt?: IPrecisionOption): string
export function calcAvg(key: string, list: Item[], opt?: IPrecisionOption): string
export function calcAvg(keyOrArr: string | Val[], listOrOpt?: Item[] | IPrecisionOption, opt?: IPrecisionOption): string {
    // Array form: second argument is opt; field-name form: second argument is list, third is opt
    const isFieldForm = Array.isArray(listOrOpt)
    const list = isFieldForm ? listOrOpt : undefined
    const o = isFieldForm ? opt : listOrOpt
    return calcAvgWith(configWithPrecision(o), keyOrArr, list)
}

/**
 * Returns the maximum value (numeric comparison, not lexicographic).
 *
 * @param keyOrArr Value array or field name
 * @param list Array of objects, required when the first argument is a field name
 * @returns Maximum value (`string`); returns `'0'` for an empty collection
 * @example
 * calcMax([3, 10, 2]) // '10'
 */
export const calcMax = (keyOrArr: string | Val[], list?: Item[]): string => {
    const values = pickValues(keyOrArr, list)
    if (values.length === 0) return '0'
    let max = values[0]!
    for (let i = 1; i < values.length; i++) if (cmp(values[i]!, max) > 0) max = values[i]!
    return max
}

/**
 * Returns the minimum value (numeric comparison).
 *
 * @param keyOrArr Value array or field name
 * @param list Array of objects, required when the first argument is a field name
 * @returns Minimum value (`string`); returns `'0'` for an empty collection
 * @example
 * calcMin([3, 10, 2]) // '2'
 */
export const calcMin = (keyOrArr: string | Val[], list?: Item[]): string => {
    const values = pickValues(keyOrArr, list)
    if (values.length === 0) return '0'
    let min = values[0]!
    for (let i = 1; i < values.length; i++) if (cmp(values[i]!, min) < 0) min = values[i]!
    return min
}
