import { Resource, TOptions } from "i18next"
import i18next from "i18next"
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

  const tn = useCallback(
    (i18nKey: string, defVal?: string, options?: TOptions) => {
      const fullKey = keyPrefix ? `${keyPrefix}.${i18nKey}` : i18nKey
      return t(fullKey, defVal ?? fullKey, { ns: NAMESPACE, ...options })
    },
    [t, keyPrefix],
  )
  const ret = useMemo(() => {
    return { tn, i18n, t }
  }, [tn, i18n, t])

  return ret
}
