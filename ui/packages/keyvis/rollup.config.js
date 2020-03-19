import typescript from 'rollup-plugin-typescript2'
import createTransformer from 'ts-import-plugin'
import commonjs from 'rollup-plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import url from 'rollup-plugin-url'
import svgr from '@svgr/rollup'
import yaml from '@rollup/plugin-yaml'

import pkg from './package.json'

// https://github.com/Brooooooklyn/ts-import-plugin
const transformer = createTransformer({
  libraryDirectory: 'es',
  libraryName: 'antd',
  style: true,
})

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],
  plugins: [
    external({
      includeDependencies: true,
    }),
    // https://github.com/egoist/rollup-plugin-postcss/issues/110
    // https://github.com/cisen/blog/issues/295
    postcss({
      extensions: ['.css', '.scss', '.less'],
      use: [
        'sass',
        [
          'less',
          {
            javascriptEnabled: true,
            globalVars: {
              '@padding-page': '48px', // TODO: keep same with root project
            },
          },
        ],
      ],
    }),
    url(),
    svgr(),
    yaml(),
    resolve(),
    typescript({
      rollupCommonJSResolveHack: true,
      clean: true,
      transformers: [
        () => ({
          before: transformer,
        }),
      ],
    }),
    commonjs(),
  ],
}
