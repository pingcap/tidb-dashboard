import { updateDistro } from '@pingcap/tidb-dashboard-lib'

import defaultDistroStringsRes from '../distro_strings.json'

let distro = defaultDistroStringsRes

// it is a base64 encoded string
let distroStringsRes = document
  .querySelector('meta[name="x-distro-strings-res"]')
  ?.getAttribute('content')

if (distroStringsRes && distroStringsRes !== '__DISTRO_STRINGS_RES__') {
  try {
    const distroObj = JSON.parse(atob(distroStringsRes))
    distro = {
      ...defaultDistroStringsRes,
      ...distroObj
    }
  } catch (error) {
    console.log(error)
  }
}

updateDistro(distro)
