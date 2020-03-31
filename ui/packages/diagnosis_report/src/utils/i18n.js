import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { translations as diagnosisTrans } from '../translations'

export function addTranslations(langs) {
  Object.keys(langs).forEach((key) => {
    const translations = langs[key]
    addTranslationResource(key, translations)
  })
  return
}

export function addTranslationResource(lang, translations) {
  i18next.addResourceBundle(lang, 'translation', translations, true, false)
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
  addTranslations(diagnosisTrans)
}

export const ALL_LANGUAGES = {
  en: 'English',
  'zh-CN': '简体中文',
}
