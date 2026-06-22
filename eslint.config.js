import antfu, { GLOB_MARKDOWN_CODE, parserPlain } from '@antfu/eslint-config'

export default antfu(
    {
        stylistic: {
            indent: 4,
            quotes: 'single',
            semi: false,
        },
        lessOpinionated: true, // 去除antfu的配置
        typescript: true,
        vue: false,
        ignores: [
            '**/dist/**',
            '**/.nuxt/**',
            '**/.output/**',
            '**/node_modules/**',
            'demo/**', // 临时杂物，单独处置
        ],
    },
    {
        rules: {
            'no-console': [
                'warn',
                {
                    allow: ['error', 'warn'],
                },
            ],
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    // "args": "after-used",
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            // 'node/prefer-global/process': ['error', 'always'],
            'curly': ['error', 'multi-line', 'consistent'], // 统一的大括号
            'style/brace-style': ['error', '1tbs', { allowSingleLine: true }], // 统一的大括号
            // antfu 7.x 的 yaml/indent 与本项目 stylistic.indent:4 冲突，对序列项产生
            // circular fixes（4 空格要 3、2 空格又要 4），无法满足，关闭以消除自相矛盾
            'yaml/indent': 'off',
        },
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
