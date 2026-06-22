export default defineNuxtConfig({
    modules: [
        '@nuxt/ui', // 先让 Nuxt UI 配置 MDC 的 prose 组件
        '@nuxtjs/i18n', // 国际化（中英双语）
        'nuxt-content-twoslash', // 必须在 @nuxt/content 之前
        '@nuxt/content',
    ],
    css: ['~/assets/css/main.css'],
    i18n: {
        defaultLocale: 'en', // 英文为主：默认路由无前缀（/），中文带 /zh/ 前缀
        strategy: 'prefix_except_default',
        locales: [
            { code: 'en', name: 'English', language: 'en-US', file: 'en.json' },
            { code: 'zh', name: '中文', language: 'zh-CN', file: 'zh.json' },
        ],
    },
    app: {
        head: {
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
            ],
        },
    },
    devtools: { enabled: false },
    compatibilityDate: '2025-01-01',
    content: {
        experimental: { sqliteConnector: 'native' },
        build: {
            markdown: {
                highlight: {
                    theme: {
                        // default 给主代码块（内联色）；light/dark 命名主题生成
                        // --shiki-light* / --shiki-dark* 变量，供 twoslash 悬停弹窗的配色 CSS 使用
                        default: 'github-light',
                        light: 'github-light',
                        dark: 'github-dark',
                    },
                    langs: ['ts', 'js', 'json', 'bash', 'vue', 'md'],
                },
            },
        },
    },
    twoslash: {
        // 代码块只用 @wzo/calc，不依赖 Nuxt 类型；关掉避免 Nuxt4 project-reference 解析报 6053
        includeNuxtTypes: false,
    },
    vite: {
        optimizeDeps: {
            include: [
                '@vueuse/core',
            ],
        },
    },
})
