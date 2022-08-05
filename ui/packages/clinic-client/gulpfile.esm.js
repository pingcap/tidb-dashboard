import { task, series } from 'gulp'
import shell from 'gulp-shell'

///////////////////////////

task('swagger:gen', shell.task('./swagger/gen_api.sh'))

///////////////////////////

task('tsc:watch', shell.task('tsc -w'))
task('tsc:build', shell.task('tsc'))

///////////////////////////

task('dev', series('swagger:gen', 'tsc:build'))
task('build', series('swagger:gen', 'tsc:build'))
