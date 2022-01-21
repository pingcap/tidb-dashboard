import { task, watch, series, parallel, src, dest } from 'gulp'
import shell from 'gulp-shell'
import Stream from 'stream'
import { getUserAgentRegExp } from 'browserslist-useragent-regexp'

task('swagger:generate_spec', shell.task('../scripts/generate_swagger_spec.sh'))

task(
  'swagger:generate_client',
  shell.task(
    'yarn openapi-generator generate -i ../swaggerspec/swagger.yaml -g typescript-axios -c .openapi_config.yaml -o lib/client/api'
  )
)

task(
  'swagger:generate',
  series('swagger:generate_spec', 'swagger:generate_client')
)

task('swagger:watch', () =>
  watch(['../cmd/**/*.go', '../pkg/**/*.go'], series('swagger:generate'))
)

task('distro:generate', shell.task('../scripts/distro/write_strings.sh'))

task('webpack:dev', shell.task('yarn react-app-rewired start'))

task('webpack:build', shell.task('yarn react-app-rewired build'))

task('esbuild:dev', shell.task('node builder.js'))

task('esbuild:build', shell.task('NODE_ENV=production node builder.js'))

task('tsc:watch', shell.task('yarn tsc --watch'))

// https://www.npmjs.com/package/eslint-watch
task('lint:watch', shell.task('yarn esw --watch --cache --ext .tsx,.ts .'))

task(
  'speedscope:copy_static_assets',
  shell.task(
    'mkdir -p public/speedscope && cp node_modules/@duorou_xu/speedscope/dist/release/* public/speedscope/'
  )
)

task('speedscope:watch', () =>
  watch(
    ['node_modules/@duorou_xu/speedscope/dist/release/*'],
    series('speedscope:copy_static_assets')
  )
)

task(
  'build',
  series(
    parallel(
      'swagger:generate',
      'distro:generate',
      'speedscope:copy_static_assets'
    ),
    'esbuild:build'
  )
)

task(
  'dev',
  series(
    parallel(
      'swagger:generate',
      'distro:generate',
      'speedscope:copy_static_assets'
    ),
    parallel(
      'swagger:watch',
      'speedscope:watch',
      'tsc:watch',
      'lint:watch',
      'esbuild:dev'
    )
  )
)

/////////////////////////////////

// inspired from: https://github.com/brwnll/gulp-version-filename/blob/master/index.js
function updateBrowserList() {
  const stream = new Stream.Transform({ objectMode: true })

  stream._transform = function (file, _filetype, callback) {
    const oriContents = file.contents.toString()
    const pattern = 'var __SUPPORTED_BROWSERS__ ='

    if (oriContents.indexOf(pattern) < 0) {
      return stream.emit('error', new Error(`Missing "${pattern}" pattern`))
    }
    const browserList = getUserAgentRegExp({ allowHigherVersions: true })
    const regPattern = new RegExp(`${pattern} .+`)
    const newContents = oriContents.replace(
      regPattern,
      `${pattern} ${browserList}`
    )
    file.contents = Buffer.from(newContents)
    callback(null, file)
  }

  return stream
}

task('gen:browserlist', () => {
  return src('public/compat.js')
    .pipe(updateBrowserList())
    .pipe(dest('public', { overwrite: true }))
})
