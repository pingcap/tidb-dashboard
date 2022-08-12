# TiDB Dashboard UI

## Arch

![ui arch](./ui_arch.png)

## Run

### Dev

1. install pnpm: `npm install -g pnpm`
1. `pnpm i`
1. `pnpm dev`

> Note:
>
> You can run `pnpm dev:op`, `pnpm dev:dbaas`, `pnpm dev:clinic`, `pnpm dev:debugportal` only to start a specific dashboard variant, while `pnpm dev` starts all of them.
>
> Before starting `pnpm dev:dbaas`, you need to start dbaas ui.
>
> Before starting `pnpm dev:clinic` and `pnpm dev:debugportal`, you need to start clinic ui.

### Build

1. `pnpm build`

### Publish `tidb-dashboard-for-dbaas` NPM package

1. `pnpm build`
1. `cd packages/tidb-dashboard-for-dbaas`
1. `pnpm publish --access public`

### Publish `tidb-dashboard-for-clinic` NPM package

1. `pnpm build`
1. `cd packages/tidb-dashboard-for-clinic`
1. `pnpm publish --access public`

### Publish `tidb-dashboard-for-debugportal` NPM package

1. `pnpm build`
1. `cd packages/tidb-dashboard-for-debugportal`
1. `pnpm publish --access public`
