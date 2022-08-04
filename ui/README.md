# TiDB Dashboard UI

## Run

### Dev

1. install pnpm: `npm install -g pnpm`
1. `pnpm i`
1. `pnpm dev`

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
