let prefix = document
  .querySelector('meta[name="x-public-path-prefix"]')
  ?.getAttribute('content')

if (prefix === '__PUBLIC_PATH_PREFIX__') {
  prefix = '/dashboard'
}

export default prefix
