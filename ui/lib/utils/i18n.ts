import 'dayjs/locale/zh-cn'

import dayjs from 'dayjs'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18next.on('languageChanged', function (lng) {
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

export function getEffetiveLang(): string {
  const effetiveLangs = Object.keys(ALL_LANGUAGES)
  const detectedLang = i18next.language
  if (effetiveLangs.includes(detectedLang)) {
    return detectedLang
  }
  if (detectedLang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en'
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {}, // oh! this line is a big pitfall, we can't remove it, else it will cause strange crash!
    fallbackLng: 'en', // fallbackLng won't change the detected language
    interpolation: {
      escapeValue: false,
    },
  })

// init dayjs locale
dayjs.locale(getEffetiveLang().toLowerCase())
