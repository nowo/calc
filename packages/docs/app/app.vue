<script setup lang="ts">
const { locale } = useI18n()

const { data: navigation } = await useAsyncData(`navigation-${locale.value}`, () => queryCollectionNavigation(`content_${locale.value}` as 'content_en' | 'content_zh'), { watch: [locale] })

const { data: files } = useLazyAsyncData(`search-${locale.value}`, () => queryCollectionSearchSections(`content_${locale.value}` as 'content_en' | 'content_zh'), { server: false, watch: [locale] })

provide('navigation', navigation)

useHead({
    htmlAttrs: { lang: computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en-US')) },
    titleTemplate: title => (title ? `${title} · @wzo/calc` : '@wzo/calc'),
})
</script>

<template>
    <UApp>
        <AppHeader />
        <UMain>
            <NuxtPage />
        </UMain>

        <AppFooter />

        <ClientOnly>
            <LazyUContentSearch :files="files || []" :navigation="navigation" shortcut="meta_k" />
        </ClientOnly>
    </UApp>
</template>
