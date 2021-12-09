interface distroStringsRes {
  is_distro: boolean
  tidb: string
  tikv: string
  pd: string
  tiflash: string
}

const defalutDistroStringsRes: distroStringsRes = {
  is_distro: false,
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD',
  tiflash: 'TiFlash',
}

let distro = defalutDistroStringsRes

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

const isDistro = Boolean(distro['is_distro'])

export { distro, isDistro }
