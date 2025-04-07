import { addLangsLocales } from "@pingcap-incubator/tidb-dashboard-lib-utils"

const I18nNamespace = "advanced-filters"
type I18nLocaleKeys =
  | "AND"
  | "Add Filter"
  | "Advanced Filters"
  | "Cancel"
  | "Filter Name"
  | "Save"
  | "WHEN"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  AND: "且",
  "Add Filter": "添加筛选条件",
  "Advanced Filters": "高级筛选",
  Cancel: "取消",
  "Filter Name": "筛选条件名称",
  Save: "保存",
  WHEN: "当",
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
