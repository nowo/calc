export default defineAppConfig({
    ui: {
        colors: {
            primary: 'emerald',
            neutral: 'neutral',
        },
    },
    site: {
        name: '@wzo/calc',
        description: '精度数学 + 数字格式化库',
    },
    // “在 GitHub 上编辑此页”链接的拼接来源；内容文件位于 <contentBase>/<locale>/<stem>.<extension>
    github: {
        repo: 'nowo/calc',
        branch: 'main',
        contentBase: 'packages/docs/content',
    },
})
