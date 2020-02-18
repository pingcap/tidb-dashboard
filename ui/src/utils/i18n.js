import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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
      translations: res.zh_CN,
    },
  });
}

function initFromResources() {
  console.log(resources);
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export default {
  loadResource,
  initFromResources,
};
