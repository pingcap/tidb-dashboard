//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

import { addLangsLocales } from "@pingcap-incubator/tidb-dashboard-lib-utils"

export const I18nNamespace = "info-table"

type I18nLocaleKeys =
  | "Description"
  | "Name"
  | "Value"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  "Description": "描述",
  "Name": "名称",
  "Value": "值"
}

export function updateI18nLocales(locales: { [ln: string]: I18nLocale }) {
  for (const [ln, locale] of Object.entries(locales)) {
    addLangsLocales({
      [ln]: {
        __namespace__: I18nNamespace,
        ...locale,
      },
    })
  }
}

updateI18nLocales({ en, zh })
