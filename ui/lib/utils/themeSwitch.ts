import assetPrefix from '@dashboard/publicPathPrefix'
import { fromEvent } from 'rxjs'

const THEME_KEY = 'theme'
const THEME_DARKMODE = 'dark'
const ANTD_DARK_STYLES = 'antd-dark'
const MAIN_DARK_STYLES = 'main-dark'

declare global {
  interface Window {
    darkmode: boolean
    manifest: Manifest
  }
  interface Manifest {
    files: Object
    entrypoints: string[]
    dark: Object
  }
}

const darkModeEventOb = fromEvent(window, 'enableDarkMode')

export function subscribeToggleDarkMode(sub: (boolean) => void) {
  return darkModeEventOb.subscribe((e: any) => sub(e.detail))
}

export function switchDarkMode(enableDark: boolean): void {
  persistDarkmode(enableDark)
  const head = document.head || document.getElementsByTagName('head')[0]
  const links = head.getElementsByTagName('link')
  if (darkmodeEnabled()) {
    // load global styles if necessary
    newGlobalDarkStyles(links).forEach((l) => head.appendChild(l))
  } else {
    const links = document.querySelectorAll(
      `link[${THEME_KEY}=${THEME_DARKMODE}]`
    )
    // remove all dark styles
    for (const link of links) {
      if (isDarkmodeStyle(link)) {
        head.removeChild(link)
      }
    }
  }
}

export function loadAppDarkStyles(appID: string): void {
  if (darkmodeEnabled() && window.manifest.dark[appID]) {
    const head = document.head || document.getElementsByTagName('head')[0]
    const url = resolvePrefix(window.manifest.dark[appID])
    const link = newCSSLink(url)
    head.appendChild(link)
  }
}

function newCSSLink(href: string): HTMLLinkElement {
  const link: HTMLLinkElement = document.createElement('link')
  link.rel = 'stylesheet'
  link.type = 'text/css'
  link.href = href
  link.setAttribute(THEME_KEY, THEME_DARKMODE)
  return link
}

const persistDarkmodeKey = '@@tidb_dashboard_darkmode'
export function persistDarkmode(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(persistDarkmodeKey, '1')
  } else {
    localStorage.removeItem(persistDarkmodeKey)
  }
}

export function darkmodeEnabled(): boolean {
  return !!localStorage.getItem(persistDarkmodeKey)
}

function resolvePrefix(s: string): string {
  return s.replace(/^__PUBLIC_PATH_PREFIX__/, assetPrefix!)
}

function newGlobalDarkStyles(
  links: HTMLCollectionOf<HTMLLinkElement>
): HTMLLinkElement[] {
  let hasAntd = false
  let hasMain = false
  for (const link of links) {
    if (link.hasAttribute(ANTD_DARK_STYLES)) {
      hasAntd = true
    }
    if (link.hasAttribute(MAIN_DARK_STYLES)) {
      hasMain = true
    }
  }
  const res: HTMLLinkElement[] = []
  if (!hasAntd) {
    const url = resolvePrefix(window.manifest.dark['antd'])
    const link = newCSSLink(url)
    link.setAttribute(ANTD_DARK_STYLES, '')
    res.push(link)
  }
  if (!hasMain) {
    const url = resolvePrefix(window.manifest.dark['main'])
    const link = newCSSLink(url)
    link.setAttribute(MAIN_DARK_STYLES, '')
    res.push(link)
  }
  return res
}

function isDarkmodeStyle(element: Element): boolean {
  return element.getAttribute(THEME_KEY) === THEME_DARKMODE
}
