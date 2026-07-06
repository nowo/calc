<script setup lang="ts">
import { useComponentProps } from '@nuxt/ui/composables/useComponentProps'
import { tv } from '@nuxt/ui/utils/tv'
import { computed } from 'vue'
import theme from '#build/ui/prose/a'

// 覆盖 Nuxt UI 的 ProseA：保留原有 prose 链接样式，仅把站内绝对链接经 localePath 本地化，
// 让中文页内链跳中文页、英文页内链跳英文页（@nuxtjs/i18n strategy: prefix_except_default）
const props = defineProps<{
    href?: string
    target?: string
    class?: any
    ui?: { base?: string }
}>()

const merged = useComponentProps('prose.a', props)
const appConfig = useAppConfig()
const localePath = useLocalePath()
const ui = computed(() => tv({ extend: tv(theme), ...((appConfig as Record<string, any>).ui?.prose?.a || {}) }))

// 仅本地化站内绝对路径（/ 开头，排除协议相对 // 与锚点 #、外链）；其余原样
const localizedHref = computed(() => {
    const h = merged.href
    if (!h || h[0] !== '/' || h.startsWith('//')) return h
    return localePath(h)
})
</script>

<template>
    <ULink :href="localizedHref" :target="merged.target" :class="ui({ class: [merged.ui?.base, merged.class] })" raw>
        <slot />
    </ULink>
</template>
