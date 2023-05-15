import { task, series } from 'gulp'
import shell from 'gulp-shell'

///////////////////////////

task('swagger:gen', shell.task('./swagger/gen_api.sh'))

///////////////////////////

task('tsc:watch', shell.task('tsc -w'))
task('tsc:build', shell.task('tsc'))

///////////////////////////

task('dev', series('swagger:gen', 'tsc:build'))

// in netlify or vercel, we only build frontend, we don't need to generate api, else it will fail because we don't have go and java
if (process.env.SKIP_GEN_API === '1') {
  task('build', shell.task('echo "skip gen api" & tsc'))
} else {
  task('build', series('swagger:gen', 'tsc:build'))
}
