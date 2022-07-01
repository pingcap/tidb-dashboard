import { task, series, parallel } from 'gulp'
import shell from 'gulp-shell'

task('tsc:watch', shell.task('tsc --watch'))
task('tsc:check', shell.task('tsc'))

// https://www.npmjs.com/package/eslint-watch
task('lint:watch', shell.task('esw --watch --cache --ext .tsx,.ts .'))
task('lint:check', shell.task('esw --cache --ext tsx,ts .'))

task('esbuild:dev', shell.task('NODE_ENV=development node builder.js'))
task('esbuild:build', shell.task('NODE_ENV=production node builder.js'))

task('dev', parallel('tsc:watch', 'lint:watch', 'esbuild:dev'))
task('build', parallel('tsc:check', 'lint:check', 'esbuild:build'))
