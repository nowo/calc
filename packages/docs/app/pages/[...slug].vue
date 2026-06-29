<script setup lang="ts">
const route = useRoute()
const { locale, t } = useI18n()
const navigation = inject<Ref<any[]>>('navigation')

const collection = computed(() => `content_${locale.value}` as 'content_en' | 'content_zh')
// i18n 路由已把语言前缀抽离，route.params.slug 是不含前缀的内容路径段
const slug = computed(() => {
    const s = route.params.slug
    return `/${(Array.isArray(s) ? s : [s].filter(Boolean)).join('/')}`
})

const { data: page } = await useAsyncData(`page-${route.path}`, async () => {
    const found = await queryCollection(collection.value).path(slug.value).first()
    // 英文缺译时回退中文，避免空页
    if (!found && locale.value === 'en')
        return queryCollection('content_zh').path(slug.value).first()
    return found
})

if (!page.value) {
    throw createError({ statusCode: 404, statusMessage: t('page.notFound'), fatal: true })
}

// 上一页 / 下一页
const localePath = useLocalePath()
const { data: surround } = await useAsyncData(`surround-${route.path}`, () =>
    queryCollectionItemSurroundings(collection.value, slug.value, { fields: ['description'] }))
// 内容集合的 path 不含语言前缀；UContentSurround 不经 ProseA，需手动本地化，否则中文页的上下页会跳英文页
const localizedSurround = computed(() =>
    (surround.value ?? []).map(item => (item ? { ...item, path: localePath((item as { path: string }).path) } : item)))

useSeoMeta({
    title: () => page.value?.title,
    description: () => page.value?.description,
})
</script>

<template>
    <UContainer>
        <UPage v-if="page">
            <template #left>
                <UPageAside>
                    <UContentNavigation :navigation="navigation" highlight :collapsible="false" />
                </UPageAside>
            </template>

            <UPageHeader :title="page.title" :description="page.description" />

            <UPageBody>
                <ContentRenderer v-if="page.body" :value="page" />

                <USeparator />
                <UContentSurround :surround="localizedSurround" />
            </UPageBody>

            <template #right>
                <UContentToc :links="page.body?.toc?.links" />
            </template>
        </UPage>
    </UContainer>
</template>
