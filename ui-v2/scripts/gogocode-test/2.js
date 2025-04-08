// https://github.com/thx/gogocode/blob/main/docs/specification/basic.zh.md

import $ from "gogocode"
import { inspect } from "util"

const source = `
export const I18nNamespace = "advanced-filters"
type I18nLocaleKeys =
  | "Advanced Filters"
  | "Add Filter"
  | "Filter Name"
  | "WHEN"
  | "AND"
  | "Cancel"
  | "Save"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  "Advanced Filters": "高级筛选",
  "Add Filter": "添加筛选条件",
  "Filter Name": "筛选条件名称",
  WHEN: "当",
  AND: "且",
  Cancel: "取消",
  Save: "保存",
}
`

const ast = $(source)

const namespace = ast.find(`const I18nNamespace = $_$`).match[0][0].value
console.log(namespace)

const res = ast.find(`const zh: I18nLocale = { $$$0 }`)
const kvs = res.match["$$$0"]
console.log(inspect(kvs))
console.log(kvs.map((kv) => `${kv.key.name}:${kv.value.value}`))

ast.replace(`type I18nLocaleKeys = $_$`, `type I18nLocaleKeys = "aa" | "bb"`)
console.log(ast.generate())

ast.replace(
  `const zh: I18nLocale = { $$$0 }`,
  `const zh: I18nLocale = { "aa": "aa", "bb": "bb" }`,
)
console.log(ast.generate())

// result:
//
// const I18nNamespace = "advanced-filters"
// type I18nLocaleKeys = "aa" | "bb"
// type I18nLocale = {
//   [K in I18nLocaleKeys]?: string
// }
// const en: I18nLocale = {}
// const zh: I18nLocale = { "aa": "aa", "bb": "bb" }
