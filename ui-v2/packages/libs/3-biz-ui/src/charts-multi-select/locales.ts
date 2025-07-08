// prettier-ignore
//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

import { addLangsLocales } from "@pingcap-incubator/tidb-dashboard-lib-utils"

export const I18nNamespace = "charts-multi-select"
type I18nLocaleKeys =
  | "All charts selected"
  | "Nothing found"
  | "Reset"
  | "Search"
  | "Show All"
  | "Show Hidden"
  | "{{selected}}/{{all}} charts selected"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  "All charts selected": "所有图表已选",
  "Nothing found": "未找到",
  Reset: "重置",
  Search: "搜索",
  "Show All": "显示全部",
  "Show Hidden": "显示未选",
  "{{selected}}/{{all}} charts selected": "{{selected}}/{{all}} 图表已选",
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
