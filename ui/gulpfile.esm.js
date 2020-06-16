import { task, watch, series, parallel } from 'gulp'
import shell from 'gulp-shell'

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

task('webpack:dev', shell.task('yarn react-app-rewired start'))

task('webpack:build', shell.task('yarn react-app-rewired build'))

task(
  'webpack:build:library',
  shell.task('yarn react-app-rewired build --library')
)

task(
  'supportedBrowsers',
  shell.task(
    'echo "window.__supported_browsers__ = $(browserslist-useragent-regexp --allowHigherVersions)" > ./public/supportedBrowsers.js'
  )
)

task(
  'unSupportedBrowsers',
  shell.task(
    'echo "window.__unsupported_browsers__ = $(browserslist-useragent-regexp "dead, IE 11" --allowHigherVersions)" > ./public/unSupportedBrowsers.js'
  )
)

//////////////////////////

task(
  'build',
  series(
    'swagger:generate',
    'supportedBrowsers',
    'unSupportedBrowsers',
    'webpack:build'
  )
)

task('build:library', series('swagger:generate', 'webpack:build:library'))

task(
  'dev',
  series(
    'swagger:generate',
    'supportedBrowsers',
    'unSupportedBrowsers',
    parallel('swagger:watch', 'webpack:dev')
  )
)
