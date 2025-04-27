import { useHotkeys } from "@tidbcloud/uikit/hooks"
import i18next, { Resource, TOptions } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { useCallback, useMemo } from "react"
import { initReactI18next, useTranslation } from "react-i18next"

export { Trans } from "react-i18next"

const DEF_DISTRO = {
  pd: "PD",
  tidb: "TiDB",
  tikv: "TiKV",
  tiflash: "TiFlash",
  ticdc: "TiCDC",
}

export function initI18n() {
  i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources: {},
      fallbackLng: "en", // fallbackLng won't change the detected language
      supportedLngs: ["zh", "en"], // supportedLngs will change the detected language
      interpolation: {
        escapeValue: false,
        defaultVariables: { distro: DEF_DISTRO },
      },
    })

  return i18next
}

export function changeLang(lang: string) {
  i18next.changeLanguage(lang)
}

function addResourceBundles(langsLocales: Resource) {
  Object.keys(langsLocales).forEach((lang) => {
    const locales = langsLocales[lang]
    const ns = locales["__namespace__"] as string
    if (!ns) {
      throw new Error(`__namespace__ not found in locales`)
    }
    i18next.addResourceBundle(lang, ns, locales, true, true)
  })
}

export function addLangsLocales(langsLocales: Resource) {
  if (i18next.isInitialized) {
    addResourceBundles(langsLocales)
  } else {
    i18next.on("initialized", function (_options) {
      addResourceBundles(langsLocales)
    })
  }
}

export function useTn(ns: string) {
  const { t, i18n } = useTranslation()

  // translate by key
  // example:
  // tk('panels.instance_top.title', 'Top 5 Node Utilization')
  // tk(`panels.${category}.title`)
  // tk("time_range.hour", "{{count}} hr", { count: 1 })
  // tk("time_range.hour", "{{count}} hrs", { count: 24 })
  // tk("time_range.hour", "", {count: n})
  const tk = useCallback(
    (i18nKey: string, defVal?: string, options?: TOptions) => {
      return t(i18nKey, defVal ?? i18nKey, { ns, ...options })
    },
    [t, ns],
  )

  // translate by text
  // example:
  // tt("how are you?")
  // tt("Hello.World")
  // tt("Clear Filters")
  // tt("hello {{name}}", { name: "world" })
  const tt = useCallback(
    (text: string, options?: TOptions) => {
      return t(text, text, { ns, ...options })
    },
    [t, ns],
  )

  const ret = useMemo(() => {
    return { tk, tt, i18n, t }
  }, [tk, tt, i18n, t])

  return ret
}

export function useHotkeyChangeLang(hotkey: string = "mod+L") {
  const { i18n } = useTranslation()
  useHotkeys([
    [hotkey, () => i18n.changeLanguage(i18n.language === "en" ? "zh" : "en")],
  ])
}
