type DistroStringsRes = {
  is_distro: boolean
  tidb: string
  tikv: string
  pd: string
  tiflash: string
}

const defalutDistroStringsRes: DistroStringsRes = {
  is_distro: false,
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD',
  tiflash: 'TiFlash',
}

let distro = defalutDistroStringsRes

// it is a base64 encoded string
let distroStringsRes = document
  .querySelector('meta[name="x-distro-strings-res"]')
  ?.getAttribute('content')

if (distroStringsRes && distroStringsRes !== '__DISTRO_STRINGS_RES__') {
  try {
    const distroObj = JSON.parse(atob(distroStringsRes))
    distro = {
      ...defalutDistroStringsRes,
      ...distroObj,
    }
  } catch (error) {
    console.log(error)
  }
}

document.title = `${distro.tidb} Dashboard`

const isDistro = Boolean(distro['is_distro'])

export { distro, isDistro }
