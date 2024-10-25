import typescript from "@rollup/plugin-typescript"

export default {
  input: {
    "slow-query/index": "src/slow-query/index.ts",
  },
  output: {
    dir: "dist",
    format: "es",
  },
  plugins: [typescript()],
}
