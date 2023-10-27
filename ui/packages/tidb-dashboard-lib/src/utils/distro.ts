import i18next from 'i18next'

interface IDistro {
  pd: string
  tidb: string
  tikv: string
  tiflash: string
  ticdc: string
  is_distro: boolean
}

const DEF_DISTRO: IDistro = {
  pd: 'PD',
  tidb: 'TiDB',
  tikv: 'TiKV',
  tiflash: 'TiFlash',
  ticdc: 'TiCDC',
  is_distro: false
}

let _distro = DEF_DISTRO

export function distro() {
  return _distro
}

export function isDistro() {
  return Boolean(_distro.is_distro)
}

// newDistro example: { tidb:'TieDB', tikv: 'TieKV' }
export function updateDistro(newDistro: Partial<IDistro>) {
  _distro = { ..._distro, ...newDistro }

  // update i18n resource
  i18next.addResourceBundle(
    'en',
    'translation',
    { distro: _distro },
    true,
    true
  )

  // update i18n interpolation defaultVariables by hack way
  // https://stackoverflow.com/a/71031838/2998877
  const interpolator = i18next.services.interpolator as any
  interpolator.options.interpolation.defaultVariables = { distro: _distro }
}
