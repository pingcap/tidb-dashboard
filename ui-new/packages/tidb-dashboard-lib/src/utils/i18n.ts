import 'dayjs/locale/zh'

import dayjs from 'dayjs'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

// import { distro, isDistro } from './distroStringsRes'

i18next.on('languageChanged', function (lng) {
  dayjs.locale(lng.toLowerCase())
})

export function addTranslations(translations) {
  Object.keys(translations).forEach((key) => {
    addTranslationResource(key, translations[key])
  })
}

export function addTranslationResource(lang, translations) {
  i18next.addResourceBundle(lang, 'translation', translations, true, true)
}

export const ALL_LANGUAGES = {
  zh: '简体中文',
  en: 'English'
}

const DEF_DISTRO = {
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD',
  tiflash: 'TiFlash',
  is_distro: false
}

let distro = DEF_DISTRO
let isDistro = DEF_DISTRO.is_distro

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          distro
        }
      }
    },
    fallbackLng: 'en', // fallbackLng won't change the detected language
    supportedLngs: ['zh', 'en'], // supportedLngs will change the detected lanuage
    interpolation: {
      escapeValue: false,
      defaultVariables: { distro }
    }
  })

// newDistro example: { tidb:'TieDB', tikv: 'TieKV' }
export function updateDistro(newDistro) {
  distro = { ...DEF_DISTRO, ...newDistro }
  isDistro = Boolean(distro['is_distro'])
  addTranslationResource('en', { distro })

  // hack, update interpolation defaultVariables
  // https://stackoverflow.com/a/71031838/2998877
  const interpolator = i18next.services.interpolator as any
  interpolator.options.interpolation.defaultVariables = { distro }
}

export { distro, isDistro }

export default {
  distro,
  isDistro,
  updateDistro,

  addTranslations,
  addTranslationResource,
  ALL_LANGUAGES
}
