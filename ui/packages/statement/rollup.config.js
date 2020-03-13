import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import yaml from '@rollup/plugin-yaml'
import postcss from 'rollup-plugin-postcss'
import external from 'rollup-plugin-peer-deps-external'
import pkg from './package.json'

export default [
  {
    input: 'src/index.ts',
    external: [],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [
      external(),
      postcss({ modules: true }),
      resolve(),
      commonjs(),
      typescript(),
      yaml(),
    ],
  },
]
