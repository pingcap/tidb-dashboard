import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import yaml from '@rollup/plugin-yaml'
import pkg from './package.json'

export default [
  {
    input: 'src/index.js',
    external: [],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [resolve(), commonjs(), yaml()],
  },
]
