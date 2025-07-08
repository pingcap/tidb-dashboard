// prettier-ignore
//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

import { addLangsLocales } from "@pingcap-incubator/tidb-dashboard-lib-utils"

export const I18nNamespace = "cols-multi-select"
type I18nLocaleKeys =
  | "Nothing found"
  | "Reset"
  | "Search columns..."
  | "Select All"
  | "Show All"
  | "Show Selected"
  | "{{selected}}/{{all}}"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  "Nothing found": "未找到",
  Reset: "重置",
  "Search columns...": "搜索列...",
  "Select All": "全选",
  "Show All": "显示全部",
  "Show Selected": "显示已选",
  "{{selected}}/{{all}}": "{{selected}}/{{all}}",
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
