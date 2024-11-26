import { useHotkeys } from "@tidbcloud/uikit/hooks"
import i18next, { Resource, TOptions } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { useCallback, useMemo } from "react"
import { initReactI18next, useTranslation } from "react-i18next"

export function initI18n() {
  i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources: {},
      fallbackLng: "en", // fallbackLng won't change the detected language
      supportedLngs: ["zh", "en"], // supportedLngs will change the detected lanuage
      interpolation: {
        escapeValue: false,
      },
    })

  return i18next
}

export function changeLang(lang: string) {
  i18next.changeLanguage(lang)
}

const NAMESPACE = "dashboard-lib"

function addResourceBundles(langsLocales: Resource) {
  Object.keys(langsLocales).forEach((key) => {
    i18next.addResourceBundle(key, NAMESPACE, langsLocales[key], true, false)
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

export function useTn(keyPrefix: string = "") {
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
      const fullKey = keyPrefix ? `${keyPrefix}.keys.${i18nKey}` : i18nKey
      return t(fullKey, defVal ?? fullKey, { ns: NAMESPACE, ...options })
    },
    [t, keyPrefix],
  )

  // translate by text
  // example:
  // tt("how are you?")
  // tt("Hello.World")
  // tt("Clear Filters")
  // tt("hello {{name}}", { name: "world" })
  const tt = useCallback(
    (text: string, options?: TOptions) => {
      const fullKey = keyPrefix ? `${keyPrefix}.texts.${text}` : text
      return t(fullKey, text, { ns: NAMESPACE, ...options })
    },
    [t, keyPrefix],
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
