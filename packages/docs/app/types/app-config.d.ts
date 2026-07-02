// 扩展 app.config 的类型（useAppConfig() 返回的 AppConfig = MergedAppConfig<Resolved, CustomAppConfig>）
// github 用于“在 GitHub 上编辑此页”链接：内容文件位于 <contentBase>/<locale>/<stem>.<extension>
declare module 'nuxt/schema' {
    interface CustomAppConfig {
        github?: {
            /** owner/repo，如 'nowo/calc' */
            repo: string
            /** 编辑链接指向的分支 */
            branch: string
            /** 内容目录相对仓库根的路径 */
            contentBase: string
        }
    }
}

export {}
