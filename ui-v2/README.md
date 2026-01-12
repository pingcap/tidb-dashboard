# TiDB Dashboard UI Lib

## Requirements

- Node >= 22.0.0
- [use corepack](https://www.totaltypescript.com/how-to-use-corepack): `corepack enable && corepack enable npm`

## Development

```bash
pnpm i
# pnpm gen:api
# pnpm gen:locales
pnpm dev:portals:test
```

## Build

```bash
pnpm i
pnpm build
```

## Release

```bash
pnpm changeset
pnpm changeset version
pnpm changeset publish
```
