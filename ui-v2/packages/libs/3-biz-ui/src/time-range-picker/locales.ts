// prettier-ignore
//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

import { addLangsLocales } from "@pingcap-incubator/tidb-dashboard-lib-utils"

const I18nNamespace = "time-range-picker"
type I18nLocaleKeys =
  | "Apply"
  | "Back"
  | "Cancel"
  | "Custom"
  | "End"
  | "Next"
  | "Past"
  | "Please select a start time after {{time}}."
  | "Please select an end time after the start time."
  | "Please select an end time before {{time}}."
  | "Start"
  | "The selection exceeds the {{duration}} limit, please select a shorter time range."
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  Apply: "应用",
  Back: "返回",
  Cancel: "取消",
  Custom: "自定义",
  End: "结束",
  Next: "未来",
  Past: "过去",
  "Please select a start time after {{time}}.":
    "请选择 {{time}} 之后的开始时间。",
  "Please select an end time after the start time.":
    "请确保结束时间在开始时间之后。",
  "Please select an end time before {{time}}.":
    "请选择 {{time}} 之前的结束时间。",
  Start: "开始",
  "The selection exceeds the {{duration}} limit, please select a shorter time range.":
    "选择超出了 {{duration}} 的限制，请选择更短的时间范围。",
}

function updateI18nLocales(locales: { [ln: string]: I18nLocale }) {
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
