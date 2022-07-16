import { updateDistro } from '@pingcap/tidb-dashboard-lib'

import defDistroStringsRes from './strings_res.json'

let distro = defDistroStringsRes

// it is a base64 encoded string
let distroStringsRes = document
  .querySelector('meta[name="x-distro-strings-res"]')
  ?.getAttribute('content')

if (distroStringsRes && distroStringsRes !== '__DISTRO_STRINGS_RES__') {
  try {
    const distroObj = JSON.parse(atob(distroStringsRes))
    distro = {
      ...defDistroStringsRes,
      ...distroObj
    }
  } catch (error) {
    console.log(error)
  }
}

updateDistro(distro)
