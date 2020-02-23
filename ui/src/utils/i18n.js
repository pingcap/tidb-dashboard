import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export function addTranslations(requireContext) {
  const keys = requireContext.keys();
  keys.forEach(key => {
    const m = key.match(/\/(.+)\.yaml/);
    if (!m) {
      return;
    }
    const lang = m[1];
    const translations = requireContext(key);
    i18next.addResourceBundle(lang, 'translation', translations, true, false);
  });
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
    });
}
