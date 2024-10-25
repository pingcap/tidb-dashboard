import typescript from "@rollup/plugin-typescript"

export default {
  input: {
    index: "src/index.ts",
    "slow-query/index": "src/slow-query/index.ts",
  },
  output: {
    dir: "dist",
    format: "es",
  },
  plugins: [typescript()],
}
