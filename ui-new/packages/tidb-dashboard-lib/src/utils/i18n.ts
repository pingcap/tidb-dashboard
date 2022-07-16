import 'dayjs/locale/zh'

import dayjs from 'dayjs'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { distro } from './distro'

i18next.on('languageChanged', function (lng) {
  dayjs.locale(lng.toLowerCase())
})

export function addTranslations(translations) {
  Object.keys(translations).forEach((key) => {
    addTranslationResource(key, translations[key])
  })
}

export function addTranslationResource(lang, translations) {
  i18next.addResourceBundle(lang, 'translation', translations, true, false)
}

export const ALL_LANGUAGES = {
  zh: '简体中文',
  en: 'English'
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          distro: distro()
        }
      }
    },
    fallbackLng: 'en', // fallbackLng won't change the detected language
    supportedLngs: ['zh', 'en'], // supportedLngs will change the detected lanuage
    interpolation: {
      escapeValue: false,
      defaultVariables: { distro: distro() }
    }
  })

export default {
  addTranslations,
  addTranslationResource,
  ALL_LANGUAGES
}
