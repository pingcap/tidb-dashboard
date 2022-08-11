import { task, series, parallel } from 'gulp'
import shell from 'gulp-shell'

task(
  'speedscope:copy',
  shell.task(
    'mkdir -p public/speedscope && cp node_modules/@duorou_xu/speedscope/dist/release/* public/speedscope/'
  )
)

task('tsc:watch', shell.task('tsc --watch'))
task('tsc:check', shell.task('tsc'))

// https://www.npmjs.com/package/eslint-watch
task('lint:watch', shell.task('esw --watch --cache --ext .tsx,.ts .'))
task('lint:check', shell.task('esw --cache --ext tsx,ts .'))

task('esbuild:dev', shell.task('NODE_ENV=development node builder.js'))
task('esbuild:build', shell.task('NODE_ENV=production node builder.js'))

task(
  'dev',
  series('speedscope:copy', parallel('tsc:watch', 'lint:watch', 'esbuild:dev'))
)

task(
  'build',
  series(
    'speedscope:copy',
    parallel('tsc:check', 'lint:check', 'esbuild:build')
  )
)
