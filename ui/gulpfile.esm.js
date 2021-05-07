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

task(
  'webpack:dev',
  shell.task(
    'REACT_APP_COMMIT_HASH=$(git rev-parse --short HEAD) yarn react-app-rewired start'
  )
)

task(
  'webpack:build',
  shell.task(
    'REACT_APP_COMMIT_HASH=$(git rev-parse --short HEAD) yarn react-app-rewired build'
  )
)

task('build', series('swagger:generate', 'webpack:build'))

task(
  'dev',
  series('swagger:generate', parallel('swagger:watch', 'webpack:dev'))
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
