export type AppOptions = {
  hideNav: boolean
  lang: string
}

const defPortalOptions: AppOptions = {
  hideNav: true,
  lang: '',
}

const optionsKey = 'portal_app_options'

export function saveAppOptions(options: AppOptions) {
  localStorage.setItem(optionsKey, JSON.stringify(options))
}

export function loadAppOptions(): AppOptions {
  const s = localStorage.getItem(optionsKey)
  if (s === null) {
    return defPortalOptions
  }
  const opt = JSON.parse(s)
  if (!!opt && opt.constructor === Object) {
    return opt
  }
  return defPortalOptions
}
