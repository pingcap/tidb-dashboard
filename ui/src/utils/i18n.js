import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import _ from 'lodash';

const resources = {
  en: {
    translation: {},
  },
  zh_CN: {
    translation: {},
  },
};

function loadResource(res) {
  _.merge(resources, {
    en: {
      translation: res.en,
    },
    zh_CN: {
      translation: res.zh_CN,
    },
  });
}

function initFromResources() {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      interpolation: {
        escapeValue: false,
      },
    });
}

export default {
  loadResource,
  initFromResources,
};
