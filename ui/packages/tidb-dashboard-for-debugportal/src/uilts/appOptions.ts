export type AppOptions = {
  apiBasePath: string
  hideNav: boolean
  skipNgmCheck: boolean
  lang: string
}

const defAppOptions: AppOptions = {
  apiBasePath: '',
  hideNav: false,
  skipNgmCheck: false,
  lang: ''
}

const optionsKey = 'dashboard_app_options'

export function saveAppOptions(options: AppOptions) {
  localStorage.setItem(optionsKey, JSON.stringify(options))
}

export function loadAppOptions(): AppOptions {
  const s = localStorage.getItem(optionsKey)
  if (s === null) {
    return defAppOptions
  }
  const opt = JSON.parse(s)
  if (!!opt && opt.constructor === Object) {
    return opt
  }
  return defAppOptions
}
