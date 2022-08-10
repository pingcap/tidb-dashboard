const DEF_PUBLIC_PATH_PREFIX = '/dashboard'

let prefix =
  document
    .querySelector('meta[name="x-public-path-prefix"]')
    ?.getAttribute('content') || DEF_PUBLIC_PATH_PREFIX

if (prefix === '__PUBLIC_PATH_PREFIX__') {
  prefix = DEF_PUBLIC_PATH_PREFIX
}

export default prefix
