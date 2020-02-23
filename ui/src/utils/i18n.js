import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import _ from 'lodash';

const resources = {};

export function loadResourceFromRequireContext(requireContext) {
  const keys = requireContext.keys();
  keys.forEach(key => {
    const m = key.match(/\/(.+)\.yaml/);
    if (!m) {
      return;
    }
    const lang = m[1];
    _.merge(resources, { [lang]: { translation: requireContext(key) } });
  });
}

export function initFromResources() {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
}
