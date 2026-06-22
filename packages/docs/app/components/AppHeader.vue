<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const navigation = inject<Ref<any[]>>('navigation')
const route = useRoute()

const items = computed(() => [
    { label: t('nav.guide'), to: localePath('/guide'), active: route.path.includes('/guide') },
    { label: t('nav.api'), to: localePath('/api'), active: route.path.includes('/api') },
    { label: t('nav.examples'), to: localePath('/examples'), active: route.path.includes('/examples') },
])

function toggleLocale() {
    setLocale(locale.value === 'en' ? 'zh' : 'en')
}
</script>

<template>
    <UHeader>
        <template #title>
            <span class="flex items-center gap-2">
                <svg viewBox="0 0 32 32" class="size-6 text-primary" fill="none" stroke="currentColor" stroke-linecap="square" aria-hidden="true">
                    <rect x="2" y="2" width="28" height="28" rx="8" stroke-width="2" />
                    <g transform="translate(6 6) scale(0.8333)" stroke-width="2.4">
                        <path d="m3.705 20.668l2.829-2.829m0 0l2.828-2.828m-2.828 2.828l-2.668-2.668m2.668 2.668l2.988 2.99M3 6.5h3.5m0 0H10m-3.5 0V3m0 3.5V10M14 6.5h7M14 18h7m-3.5-3.002h.004v.004H17.5zm0 6h.004v.004H17.5z" />
                    </g>
                </svg>
                <span class="font-bold text-highlighted">@wzo/calc</span>
            </span>
        </template>

        <UNavigationMenu :items="items" highlight />

        <template #right>
            <UContentSearchButton variant="ghost" />
            <UButton :label="locale === 'en' ? '中文' : 'EN'" icon="i-lucide-languages" color="neutral" variant="ghost" @click="toggleLocale" />
            <UColorModeButton />
            <UButton
                icon="i-simple-icons-github"
                color="neutral"
                variant="ghost"
                to="https://github.com/nowo/calc"
                target="_blank"
                aria-label="GitHub"
            />
        </template>

        <template #body>
            <UContentNavigation :navigation="navigation" highlight />
        </template>
    </UHeader>
</template>
