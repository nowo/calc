<script setup lang="ts">
// 文档内嵌的可运行 Playground：把 @wzo/calc 全部 API 注入作用域，
// 在浏览器里实时执行用户编辑的代码并展示输出。
import * as calcApi from '@wzo/calc'
import { onMounted, ref, shallowRef } from 'vue'

const props = withDefaults(defineProps<{
    /** 初始代码；也可以把代码写在默认插槽（```ts 代码块）里 */
    code?: string
    /** 卡片标题 */
    title?: string
    /** 挂载后是否自动运行一次 */
    autoRun?: boolean
}>(), {
    code: '',
    title: '在线运行',
    autoRun: true,
})

interface OutLine { text: string, error?: boolean }

const src = ref(props.code.trim())
const lines = shallowRef<OutLine[]>([])
const slotEl = ref<HTMLElement | null>(null)

// 运行时可用的 API 名（剔除 TS 类型等运行时不存在的成员）
const apiNames = Object.keys(calcApi).filter(k => (calcApi as any)[k] !== undefined)

// 行首是这些关键字的视为语句，不自动打印
const STMT_KEYWORD = /^(?:const|let|var|function|class|if|else|for|while|do|switch|case|default|return|throw|try|catch|finally|import|export|break|continue|with|async)\b/
const RE_STMT_START = /^[{}()\][;]/ // 行首是括号 / 分号等，视为语句片段
const RE_CONSOLE = /^console\s*\./ // console.* 调用原样保留
const RE_ASSIGN = /[^=!<>]=[^=]/ // 赋值语句（排除 == / === / => 等）
const RE_TRAIL_SEMI = /;+\s*$/ // 行尾分号

/** 去掉行注释与块注释，但保留字符串 / 模板字面量里的内容（如 fmt(0.5, '//')） */
function stripComments(code: string): string {
    let out = ''
    let i = 0
    let str: string | null = null
    while (i < code.length) {
        const c = code[i]!
        const d = code[i + 1]
        if (str) {
            out += c
            if (c === '\\') {
                out += d ?? ''
                i += 2
                continue
            }
            if (c === str) str = null
            i++
            continue
        }
        if (c === '"' || c === '\'' || c === '`') {
            str = c
            out += c
            i++
            continue
        }
        if (c === '/' && d === '/') {
            while (i < code.length && code[i] !== '\n') i++
            continue
        }
        if (c === '/' && d === '*') {
            i += 2
            while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
            i += 2
            continue
        }
        out += c
        i++
    }
    return out
}

/** REPL 化：逐行把「裸表达式」包成 __repl(...) 自动打印，语句 / console.* 原样保留 */
function instrument(code: string): string {
    return stripComments(code).split('\n').map((raw) => {
        const t = raw.trim()
        if (!t) return ''
        if (RE_STMT_START.test(t) || STMT_KEYWORD.test(t) || RE_CONSOLE.test(t)) return raw
        if (RE_ASSIGN.test(t) && !t.includes('=>')) return raw // 赋值语句
        return `__repl((${t.replace(RE_TRAIL_SEMI, '')}));`
    }).join('\n')
}

/** 把任意值格式化成贴近源码的展示文本：字符串带引号、bigint 带 n */
function fmtArg(v: unknown): string {
    if (typeof v === 'string') return JSON.stringify(v)
    if (typeof v === 'bigint') return `${v}n`
    if (typeof v === 'function') return v.name ? `[Function: ${v.name}]` : '[Function]'
    if (v === undefined) return 'undefined'
    if (v === null) return 'null'
    if (typeof v === 'object') {
        try {
            return JSON.stringify(v)
        } catch {
            return String(v)
        }
    }
    return String(v)
}

function run() {
    const out: OutLine[] = []
    const sandboxConsole = {
        log: (...a: unknown[]) => out.push({ text: a.map(fmtArg).join(' ') }),
        info: (...a: unknown[]) => out.push({ text: a.map(fmtArg).join(' ') }),
        warn: (...a: unknown[]) => out.push({ text: a.map(fmtArg).join(' ') }),
        error: (...a: unknown[]) => out.push({ text: a.map(fmtArg).join(' '), error: true }),
    }
    const repl = (v: unknown) => {
        // 自动打印时跳过 undefined（如 setConfig 等无返回值的调用），避免输出噪声
        if (v !== undefined) out.push({ text: fmtArg(v) })
        return v
    }

    const runBody = (body: string) => {
        // eslint-disable-next-line no-new-func
        const fn = new Function(...apiNames, 'console', '__repl', body)
        fn(...apiNames.map(n => (calcApi as any)[n]), sandboxConsole, repl)
    }

    const raw = src.value.trim()
    try {
        // 先按 REPL 方式跑（每个裸表达式自动打印）
        runBody(instrument(raw))
    } catch (e) {
        // REPL 改写后语法不合法（如跨行表达式）→ 回退原样执行，用户可用 console.log 打印
        if (e instanceof SyntaxError) {
            out.length = 0
            try {
                runBody(raw)
            } catch (e2) {
                out.push({ text: String(e2 instanceof Error ? e2.message : e2), error: true })
            }
        } else {
            out.push({ text: String(e instanceof Error ? e.message : e), error: true })
        }
    }
    if (out.length === 0) out.push({ text: '（无输出，用 console.log(...) 打印结果）' })
    lines.value = out
}

function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        run()
    }
}

onMounted(() => {
    // 未传 code prop 时，从默认插槽的代码块文本读取（优先取 <code> 内容）
    if (!src.value && slotEl.value) {
        const codeEl = slotEl.value.querySelector('code')
        const text = (codeEl ?? slotEl.value).textContent?.trim() ?? ''
        if (text) src.value = text
    }
    if (props.autoRun && src.value) run()
})
</script>

<template>
    <div class="cp">
        <!-- 插槽里的代码块仅用于取文本，不展示 -->
        <div ref="slotEl" class="cp-slot">
            <slot />
        </div>

        <div class="cp-head">
            <span class="cp-dot" />
            <span class="cp-title">{{ title }}</span>
            <span class="cp-hint">⌘/Ctrl + Enter 运行</span>
        </div>

        <textarea v-model="src" class="cp-editor" spellcheck="false" autocapitalize="off" autocomplete="off" rows="4"
            @keydown="onKeydown" />

        <div class="cp-bar">
            <button type="button" class="cp-run" @click="run">
                运行 ▶
            </button>
        </div>

        <div v-if="lines.length" class="cp-output">
            <div v-for="(l, i) in lines" :key="i" class="cp-line" :class="{ 'cp-error': l.error }">
                {{ l.error ? '✕ '
                    : '→ ' }}{{ l.text }}
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 全部用 Nuxt UI 设计变量，随明/暗主题自动切换，避免硬编码色值导致暗色不可读 */
.cp {
    margin: 1.25rem 0;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius, 8px);
    overflow: hidden;
    background: var(--ui-bg-muted);
    color: var(--ui-text);
    font-size: 0.875rem;
}

.cp-slot {
    display: none;
}

.cp-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-bg-accented);
}

.cp-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ui-primary);
}

.cp-title {
    font-weight: 600;
    color: var(--ui-text-highlighted);
}

.cp-hint {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--ui-text-dimmed);
}

.cp-editor {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem;
    border: 0;
    outline: 0;
    resize: vertical;
    background: transparent;
    color: var(--ui-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    tab-size: 2;
}

.cp-bar {
    display: flex;
    padding: 0 0.75rem 0.75rem;
}

.cp-run {
    cursor: pointer;
    padding: 0.3rem 0.9rem;
    border: 0;
    border-radius: 6px;
    background: var(--ui-primary);
    color: #fff;
    font-weight: 600;
    font-size: 0.8125rem;
    transition: opacity 0.15s;
}

.cp-run:hover {
    opacity: 0.85;
}

.cp-output {
    padding: 0.6rem 0.75rem;
    border-top: 1px solid var(--ui-border);
    background: var(--ui-bg);
    color: var(--ui-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
}

.cp-line {
    color: var(--ui-text);
}

.cp-error {
    /* red-500：在明、暗背景上都有足够对比 */
    color: #ef4444 !important;
}
</style>
