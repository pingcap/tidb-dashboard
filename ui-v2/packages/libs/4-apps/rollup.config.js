import typescript from "@rollup/plugin-typescript"
import json from "@rollup/plugin-json"

export default {
  input: {
    index: "src/index.ts",
    "slow-query/index": "src/slow-query/index.ts",
    "statement/index": "src/statement/index.ts",
    "metric/index": "src/metric/index.ts",
    "index-advisor/index": "src/index-advisor/index.ts",
    // _re-exports
    "_re-exports/utils": "src/_re-exports/utils.ts",
    "_re-exports/charts": "src/_re-exports/charts.ts",
    "_re-exports/charts-css": "src/_re-exports/charts-css.ts",
    "_re-exports/primitive-ui": "src/_re-exports/primitive-ui.ts",
    "_re-exports/biz-ui": "src/_re-exports/biz-ui.ts",
  },
  output: {
    dir: "dist",
    format: "es",
  },
  plugins: [typescript(), json()],
}
