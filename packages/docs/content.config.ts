import { defineCollection, defineContentConfig } from '@nuxt/content'

// 每个语言一个 collection，source 指向对应语言目录；prefix '' 去掉语言目录前缀
// （content/en/guide/x.md → 路径 /guide/x，语言前缀由 @nuxtjs/i18n 的路由 strategy 负责）
function localeCollection(dir: string) {
    return defineCollection({
        type: 'page',
        source: { include: `${dir}/**`, prefix: '' },
    })
}

export default defineContentConfig({
    collections: {
        content_en: localeCollection('en'),
        content_zh: localeCollection('zh'),
    },
})
