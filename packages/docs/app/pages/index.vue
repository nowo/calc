<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
    title: () => `${t('home.heroTitle1')} ${t('home.heroTitle2')}`,
    description: () => t('home.heroDescription'),
})

const installCmd = 'pnpm add @wzo/calc'
const { copy, copied } = useClipboard({ source: installCmd })

const features = computed(() => ([
    { key: 'precision', icon: 'i-lucide-calculator' },
    { key: 'formatting', icon: 'i-lucide-hash' },
    { key: 'expression', icon: 'i-lucide-square-function' },
    { key: 'apiStyles', icon: 'i-lucide-layers' },
    { key: 'zeroDeps', icon: 'i-lucide-package' },
    { key: 'typescript', icon: 'i-simple-icons-typescript' },
] as const).map(f => ({
    title: t(`home.features.${f.key}.title`),
    description: t(`home.features.${f.key}.description`),
    icon: f.icon,
})))
</script>

<template>
    <div>
        <UPageHero orientation="horizontal" :description="t('home.heroDescription')">
            <template #title>
                {{ t('home.heroTitle1') }}<br>
                <span class="text-primary">{{ t('home.heroTitle2') }}</span>
            </template>

            <template #links>
                <UButton :label="t('home.getStarted')" :to="localePath('/guide/getting-started')" trailing-icon="i-lucide-arrow-right" size="lg" />
                <UButton :label="installCmd" :trailing-icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                    color="neutral" variant="outline" size="lg" class="font-mono" @click="copy()" />
            </template>

            <QuickStart class="w-full [&_pre]:my-0" />
        </UPageHero>

        <UPageSection :title="t('home.whyTitle')" :description="t('home.whyDescription')">
            <UPageGrid>
                <UPageCard v-for="f in features" :key="f.title" :title="f.title" :description="f.description"
                    :icon="f.icon" spotlight />
            </UPageGrid>
        </UPageSection>

        <UPageCTA :title="t('home.ctaTitle')" :description="t('home.ctaDescription')" variant="subtle" class="mb-24" :links="[
            { label: t('home.getStarted'), to: localePath('/guide/getting-started'), size: 'lg' },
            { label: t('home.apiReference'), to: localePath('/api'), variant: 'subtle', color: 'neutral', size: 'lg' },
        ]" />
    </div>
</template>
