import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'

i18next.on('languageChanged', function (lng) {
  console.log('Language', lng)
  dayjs.locale(lng.toLowerCase())
})

export function addTranslations(requireContext) {
  if (typeof requireContext === 'object') {
    Object.keys(requireContext).forEach((key) => {
      const translations = requireContext[key]
      addTranslationResource(key, translations)
    })
    return
  }

  const keys = requireContext.keys()
  keys.forEach((key) => {
    const m = key.match(/\/(.+)\.yaml/)
    if (!m) {
      return
    }
    const lang = m[1]
    const translations = requireContext(key)
    addTranslationResource(lang, translations)
  })
}

export function addTranslationResource(lang, translations) {
  i18next.addResourceBundle(lang, 'translation', translations, true, false)
}

export const ALL_LANGUAGES = {
  'zh-CN': '简体中文',
  en: 'English',
}

export function init() {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {},
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    })
}
