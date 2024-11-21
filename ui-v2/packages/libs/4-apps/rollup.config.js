import typescript from "@rollup/plugin-typescript"
import json from "@rollup/plugin-json"

export default {
  input: {
    index: "src/index.ts",
    "slow-query/index": "src/slow-query/index.ts",
    "statement/index": "src/statement/index.ts",
    "metric/index": "src/metric/index.ts",
    "index-advisor/index": "src/index-advisor/index.ts",
  },
  output: {
    dir: "dist",
    format: "es",
  },
  plugins: [typescript(), json()],
}
