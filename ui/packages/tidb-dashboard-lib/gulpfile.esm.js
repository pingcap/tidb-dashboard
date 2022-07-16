import { task, parallel } from 'gulp'
import shell from 'gulp-shell'

// below way doesn't work
// task('tsc:dev', parallel(shell.task('tsc -w'), shell.task('tsc-alias -w')))

// https://stackoverflow.com/a/47305304/2998877
task('tsc:dev', shell.task('tsc-watch --onCompilationComplete "tsc-alias"'))
task('tsc:build', shell.task('tsc && tsc-alias'))

// https://www.npmjs.com/package/eslint-watch
task('lint:watch', shell.task('esw --watch --cache --ext .tsx,.ts src/'))
task('lint:check', shell.task('esw --cache --ext tsx,ts src/'))

task('esbuild:dev', shell.task('NODE_ENV=development node builder.js'))
task('esbuild:build', shell.task('NODE_ENV=production node builder.js'))

task('dev', parallel('tsc:dev', 'lint:watch', 'esbuild:dev'))
task('build', parallel('tsc:build', 'lint:check', 'esbuild:build'))
