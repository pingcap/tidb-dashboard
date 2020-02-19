import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import _ from 'lodash';

const resources = {};
const languages = ['en', 'zh_CN'];

function loadResource(res) {
  languages.forEach(lang => {
    _.merge(resources, { [lang]: { translation: res[lang] } });
  });
}

function initFromResources() {
  // Resource languages are like `zh_CN` for easier writing.
  // However we need to change them to `zh-CN` to follow IETF language codes.
  const r = _(resources)
    .toPairs()
    .map(([key, value]) => [key.replace(/_/g, '-'), value])
    .fromPairs()
    .value();

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: r,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
}

export default {
  loadResource,
  initFromResources,
};
