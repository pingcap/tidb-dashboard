# TiDB Dashboard UI

## Run

### Dev

1. install pnpm: `npm install -g pnpm`
1. `pnpm i`
1. `pnpm dev`

> Notice
>
> After changing the `tidb-dashboard-lib` codes, it will rebuild the `tidb-dashboard-lib` automatically, but it won't trigger `tidb-dashborad-for-op` and `tidb-dashboard-for-dbaas` to rebuild (it needs to be improved. I have tried to listen the `tidb-dashboard-lib` changes for the `tidb-dashboard-for-op` and `tidb-dashboard-for-dbaas`, but it triggers too many rebuilds and slows the dev rebuild much).
>
> You can add or remove one blank line in a `.ts` file in the `tidb-dashboard-for-op` or `tidb-dashboard-for-dbaas` to trigger rebuild after changing the `tidb-dashboard-lib` codes.

### Build

1. `pnpm build`

### Publish `tidb-dashboard-for-dbaas` NPM package

1. `pnpm build`
1. `cd packages/tidb-dashboard-for-dbaas`
1. `pnpm publish --access public`
