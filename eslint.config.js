import defineConfig, { GLOB_MARKDOWN_CODE, parserPlain } from '@wzo/eslint-config'

// @wzo/eslint-config 已内置本团队风格（4 空格 / 单引号 / 无分号）及规则；这里只补项目专属项
export default defineConfig(
    {
        vue: true,
        ignores: [
            '**/dist/**',
            '**/.nuxt/**',
            '**/.output/**',
            '**/node_modules/**',
            'demo/**', // 临时杂物，单独处置
        ],
    },
    {
        // 文档（.md）里的代码块是面向阅读的教学示例：含故意演示精度丢失的数字、
        // API 签名展示等，不是要编译运行的源码。用 parserPlain 当纯文本处理，
        // 不做 AST 级 lint，避免 no-loss-of-precision / 签名解析等误报。
        files: [GLOB_MARKDOWN_CODE],
        name: 'local/markdown-code-as-plain',
        languageOptions: { parser: parserPlain },
    },
)
