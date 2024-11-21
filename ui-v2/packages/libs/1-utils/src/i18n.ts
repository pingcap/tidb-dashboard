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

export function addLangsLocales(langsLocales: Resource) {
  i18next.on("initialized", function (_options) {
    Object.keys(langsLocales).forEach((key) => {
      // `addResourceBundle` should be called after `initialized`, else it reports error
      i18next.addResourceBundle(
        key,
        "translation",
        langsLocales[key],
        true,
        false,
      )
    })
  })
}

export function useTn() {
  const { t } = useTranslation()

  const tn = useCallback(
    (i18nKey: string, defVal?: string, options?: TOptions) => {
      return t(i18nKey, defVal ?? i18nKey, options)
    },
    [t],
  )
  const ret = useMemo(() => {
    return { tn }
  }, [tn])

  return ret
}
