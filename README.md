<p align="center">
  <img src="./packages/main/logo.svg" width="88" height="88" alt="calc" />
</p>

<h1 align="center">calc</h1>

<p align="center"><b>English</b> | <a href="./README.zh.md">简体中文</a></p>

> A monorepo for a precision-math + number-formatting library — fixes JS floating-point errors with BigInt and provides type-friendly formatting.

```ts
import { calc, fmt } from '@wzo/calc'

calc('0.1 + 0.2') // "0.3"  (instead of 0.30000000000000004)
fmt(1234567, { decimals: 2, thousands: true }) // "1,234,567.00"
```

## Repository structure

| Package | Description |
| :--- | :--- |
| [`packages/main`](./packages/main) (`@wzo/calc`) | Core library: zero runtime deps, BigInt all the way down |
| [`packages/docs`](./packages/docs) | Docs site (Nuxt Content + Nuxt UI, code blocks with Twoslash type-on-hover) |

For the library's features, API and usage see [`packages/main/README.md`](./packages/main/README.md); for the full docs see [nowo.github.io/calc](https://nowo.github.io/calc).

## Local development

```bash
pnpm install          # install dependencies
pnpm test             # run unit tests
pnpm typecheck        # type-check
pnpm lint             # lint
pnpm build            # build the core library
pnpm docs:dev         # start the docs site (localhost:3000)
```

> After editing `packages/main` source, run `pnpm build` before the docs site picks up the changes (the docs use `dist`).

## Tech stack

- **Build**: [tsdown](https://tsdown.dev) (powered by Rolldown)
- **Testing**: [Vitest](https://vitest.dev)
- **Linting**: [@antfu/eslint-config](https://github.com/antfu/eslint-config)
- **Docs**: [Nuxt Content](https://content.nuxt.com) + [Nuxt UI](https://ui.nuxt.com) + [Twoslash](https://twoslash.netlify.app)
- **Package manager**: pnpm workspace

## License

MIT
