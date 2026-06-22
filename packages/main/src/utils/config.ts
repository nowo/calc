// Global config: error fallback, default format, division precision

import type { IFormat } from './format'

export interface IGlobalConfig {
    /** Fallback value on error: defaults to `'-'`; set to `0` to return `'0'` on error. */
    _error: string | number
    /** Global default format ({@link IFormat} object). */
    _fmt: IFormat | undefined
    /** Division precision (maximum decimal places). */
    _precision: number
}

/** Default configuration values. */
export const DEFAULT_CONFIG: IGlobalConfig = {
    _error: '-',
    _fmt: undefined,
    _precision: 50,
}

/** Per-call precision override: optional last argument accepted by `div` / `divStr` / `chainDiv` / `calcAvg`. */
export interface IPrecisionOption {
    /** Division precision for this call, overrides the global `_precision` (does not affect the global config). */
    _precision?: number
}

const config: IGlobalConfig = { ...DEFAULT_CONFIG }

/**
 * Partially updates the global configuration (only the provided fields are overwritten).
 *
 * @param patch Configuration fields to update
 * @example
 * setConfig({ _precision: 10, _fmt: { decimals: 2 } })
 */
export const setConfig = (patch: Partial<IGlobalConfig>): void => {
    Object.assign(config, patch)
}

/**
 * Resets the global configuration to its default values.
 *
 * @example
 * resetConfig()
 */
export const resetConfig = (): void => {
    Object.assign(config, DEFAULT_CONFIG)
}

/**
 * Returns the current global configuration object (by reference — do not mutate directly; use {@link setConfig}).
 *
 * @returns The current {@link IGlobalConfig}
 */
export const getConfig = (): IGlobalConfig => config

/** Returns the global config; if `_precision` is provided, returns a copy with that field overridden without mutating the global singleton. */
export const configWithPrecision = (opt?: IPrecisionOption): IGlobalConfig =>
    opt?._precision != null ? { ...config, _precision: opt._precision } : config
