import publicPathPrefix from '../publicPathPrefix'

let timestamp = document
  .querySelector('meta[name="x-distro-assets-res-timestamp"]')
  ?.getAttribute('content')

if (timestamp === '__DISTRO_ASSETS_RES_TIMESTAMP__') {
  timestamp = new Date().valueOf() + ''
}

const logoSvg = `${publicPathPrefix}/distro-res/logo.svg?t=${timestamp}`
const lightLogoSvg = `${publicPathPrefix}/distro-res/logo-icon-light.svg?t=${timestamp}`
const landingSvg = `${publicPathPrefix}/distro-res/landing.png?t=${timestamp}`

export { logoSvg, lightLogoSvg, landingSvg }
