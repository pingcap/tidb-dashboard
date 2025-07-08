// https://github.com/thx/gogocode/blob/main/docs/specification/basic.zh.md

import $ from "gogocode"
import { inspect } from "util"

const source = `
<Typography>
  <Trans
    ns="slow-query"
    i18nKey={
      "When opening the detail page, you can press <kbd>Ctrl</kbd> or <kbd>⌘</kbd> to view it in a new tab, or <kbd>Shift</kbd> to view it in a new window."
    }
    // components={{ kbd: <Kbd /> }}
  />
</Typography>
`

const ast = $(source)

const res = ast.find(`<Trans $$$0 />`)
console.log(res.length)
console.log(inspect(res.match["$$$0"]))
const item = res.match["$$$0"].find((item) => item.name.name === "ns")
console.log(inspect(item))
console.log(
  res.match["$$$0"].map(
    (kv) => `${kv.name.name}:${kv.value.value || kv.value.expression.value}`,
  ),
)
res.match["$$$0"].forEach((item) => {
  if (item.value.type === "JSXExpressionContainer") {
    console.log(inspect(item.value))
    console.log(item.value.expression.value)
  }
})
