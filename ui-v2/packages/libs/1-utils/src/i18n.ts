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

function addResourceBundles(langsLocales: Resource) {
  Object.keys(langsLocales).forEach((key) => {
    i18next.addResourceBundle(
      key,
      "translation",
      langsLocales[key],
      true,
      false,
    )
  })
}

export function addLangsLocales(langsLocales: Resource) {
  console.log("addLangsLocales:", langsLocales)

  if (i18next.isInitialized) {
    console.log("is initialized:", langsLocales)
    addResourceBundles(langsLocales)
  } else {
    i18next.on("initialized", function (_options) {
      console.log("initialized callback", langsLocales)
      addResourceBundles(langsLocales)
    })
  }
}

export function useTn() {
  const { t, i18n } = useTranslation()

  const tn = useCallback(
    (i18nKey: string, defVal?: string, options?: TOptions) => {
      return t(i18nKey, defVal ?? i18nKey, options)
    },
    [t],
  )
  const ret = useMemo(() => {
    return { tn, i18n, t }
  }, [tn, i18n, t])

  return ret
}