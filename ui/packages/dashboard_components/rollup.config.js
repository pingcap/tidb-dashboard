import pkg from './package.json'
import baseConfig from '../rollup.config.base'

export default {
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
  ...baseConfig,
}
