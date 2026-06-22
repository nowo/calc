<script setup lang="ts">
// 复用 content/<locale>/snippets/quick-start.md（首页 hero 同款代码组），避免多处拷贝
const { locale } = useI18n()
const { data } = await useAsyncData(`quick-start-${locale.value}`, () => queryCollection(`content_${locale.value}` as 'content_en' | 'content_zh').path('/snippets/quick-start').first(), { watch: [locale] })
</script>

<template>
    <ContentRenderer v-if="data" :value="data" />
</template>
