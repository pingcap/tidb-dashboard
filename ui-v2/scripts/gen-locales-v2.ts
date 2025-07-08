import * as fs from "fs"
import * as path from "path"

import { glob } from "glob"
import $ from "gogocode"

//-------------------
// options
const OPTIONS = {
  scanPaths: [
    "packages/libs/3-biz-ui/src/**/*.{ts,tsx,js,jsx}",
    "packages/libs/4-apps/src/**/*.{ts,tsx,js,jsx}",
  ],
  nsLocaleFolder: {
    shared: "packages/libs/4-apps/src/_shared",
  },
}

//-------------------
// types
interface NamespaceData {
  [ns: string]: {
    type: "component" | "app"
    path: string
    files: string[]
  }
}

interface LocaleData {
  [ns: string]: {
    keys: Record<string, string>
    texts: Record<string, string>
  }
}

//-------------------
// main
async function generateLocales() {
  const nsData: NamespaceData = {}
  const localeData: LocaleData = {}

  // init nsData by OPTIONS
  for (const ns of Object.keys(OPTIONS.nsLocaleFolder || {})) {
    nsData[ns] = {
      type: "app",
      path: OPTIONS.nsLocaleFolder[ns],
      files: [],
    }
    localeData[ns] = {
      keys: {},
      texts: {},
    }
  }

  // extract namespaces
  await extractNs(nsData)

  // extract locales
  for (const ns of Object.keys(nsData)) {
    for (const file of nsData[ns].files) {
      extractLocales(localeData, ns, file)
    }
  }

  // sort
  sortLocaleData(localeData)

  // output
  for (const ns of Object.keys(nsData)) {
    if (nsData[ns].type === "app") {
      outputAppLocales(localeData, ns, nsData[ns].path)
    } else {
      outputComponentLocales(localeData, ns, nsData[ns].path)
    }
  }
}

//-------------------

async function extractNs(nsData: NamespaceData) {
  // Scan all TypeScript/JavaScript files in the apps folder
  const files = await glob(OPTIONS.scanPaths)

  // traverse files to get all component namespaces
  for (const filePath of files) {
    const code = fs.readFileSync(filePath, "utf-8")
    const ast = $(code)

    if (!ast.find) {
      console.error(`no find method, file: ${filePath}`)
      continue
    }

    const componentNs = ast.find("const I18nNamespace = $_$0")
    if (componentNs.length >= 1) {
      const nsVal = componentNs.match[0][0].value
      if (nsData[nsVal]) {
        console.error("component namespace existed: " + nsVal)
        continue
      }
      nsData[nsVal] = {
        type: "component",
        path: filePath,
        files: [],
      }
    }
  }

  // traverse files to get all app namespaces, and target files
  for (const filePath of files) {
    const code = fs.readFileSync(filePath, "utf-8")
    const ast = $(code)

    if (!ast.find) {
      console.error(`no find method, file: ${filePath}`)
      continue
    }

    const appNs = ast.find("const { $$$0 } = useTn($_$0)")
    if (appNs.length >= 1) {
      const nsVal = appNs.match[0][0].value

      if (nsData[nsVal]) {
        nsData[nsVal].files.push(filePath)
        continue
      }

      const nsFolderPos = filePath.indexOf(`/${nsVal}`)
      if (nsFolderPos === -1) {
        console.error(filePath)
        console.error(`namespace mismatch: ${nsVal}`)
        continue
      }
      nsData[nsVal] = {
        type: "app",
        path: filePath.slice(0, nsFolderPos) + "/" + nsVal,
        files: [filePath],
      }
    }

    // handle <Trans/>, have multiple different <Trans/> in one file
    ast
      .find("<Trans $$$0 />")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((transItem: any) => {
        // console.log(filePath)
        const match = transItem.match["$$$0"]
        const nsItem = match.find((item) => item.name.name === "ns")
        const nsVal = nsItem?.value.value || nsItem?.value.expression.value
        // console.log(nsVal)
        if (!nsVal) {
          // ignore, continue
          console.error(`ns is not correct, just ignore it, file: ${filePath}`)
          return
        }
        const i18nKeyItem = match.find((item) => item.name.name === "i18nKey")
        const i18nKeyVal =
          i18nKeyItem?.value.value || i18nKeyItem?.value.expression.value
        // console.log(i18nKeyVal)
        if (!i18nKeyVal) {
          // ignore, continue
          console.error(
            `i18nKey is not correct, just ignore it, file: ${filePath}`,
          )
          return
        }
        if (nsData[nsVal]) {
          if (!nsData[nsVal].files.includes(filePath)) {
            nsData[nsVal].files.push(filePath)
          }
          return
        }

        const nsFolderPos = filePath.indexOf(`/${nsVal}`)
        if (nsFolderPos === -1) {
          console.error(filePath)
          console.error(`namespace mismatch: ${nsVal}`)
          return
        }
        nsData[nsVal] = {
          type: "app",
          path: filePath.slice(0, nsFolderPos) + "/" + nsVal,
          files: [filePath],
        }
      })
  }
  // console.log(nsData)
}

function extractLocales(localeData: LocaleData, ns: string, filePath: string) {
  // init app data
  if (!localeData[ns]) {
    localeData[ns] = {
      keys: {},
      texts: {},
    }
  }

  const code = fs.readFileSync(filePath, "utf-8")
  const ast = $(code)

  // Handle `tk` calls, likes:
  // tk(`panels.${props.config.category}`)
  // tk("panels.instance_top", "Top 5 Node Utilization")
  // tk("time_range.hour", "{{count}} hr", { count: 1 })
  // tk("time_range.hour", "{{count}} hrs", { count: 24 })
  // tk("time_range.hour", "", {count: n})
  // tk("time_range.hour", "", {ns: 'shared'})
  ast
    .find("tk($$$0)") // match all arguments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .each((tkItem: any) => {
      const match = tkItem.match["$$$0"]
      if (match.length === 1 || match[0].value === undefined) {
        // ignore this kind of case, likes:
        // tk(`panels.${props.config.category}`)
        // tk(`panels.${props.config.category}`, props.config.category)
      } else {
        let key = match[0].value
        const value = match[1].value
        if (!value) {
          // continue
          return
        }
        let finalNs = ns
        if (match.length === 3) {
          // handle plural case
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const options: any = {}
          for (const option of match[2].properties) {
            options[option.key.name] = option.value.value
          }
          // {count: n}  --> {count: undefined}
          // {count: 1}  --> {count: 1}
          // {count: 24} --> {count: 24}
          if (options.count === 0) {
            key = `${key}_zero`
          } else if (options.count === 1) {
            key = `${key}_one`
          } else if (options.count > 1) {
            key = `${key}_other`
          }
          if (options.ns) {
            finalNs = options.ns
          }
        }

        // check whether value is existed
        const existedVal = localeData[finalNs].keys[key]
        if (existedVal !== undefined && existedVal !== value) {
          console.error(
            `same keys but have different values, key: ${key}, values: ${existedVal}, ${value}`,
          )
          // break
          return false
        }
        localeData[finalNs].keys[key] = value
      }
    })

  // Handle `tt` calls, likes:
  // tt('Clear Filters')
  // tt("hello {{name}}", { name: "world" })
  // ast
  //   .find("tt($_$)") // same as `find("tt($_$0)")`, only match the first argument
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   .each((tnItem: any) => {
  //     const text = tnItem.match[0][0].value
  //     localeData[ns].texts[text] = text
  //   })

  // Handle `tt` calls, likes:
  // tt('Clear Filters')
  // tt("hello {{name}}", { name: "world" })
  // tt("hello {{name}}", { name: "world", ns: "shared" })
  ast
    .find("tt($$$0)") // same as `find("tt($_$0)")`, only match the first argument
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .each((tnItem: any) => {
      const match = tnItem.match["$$$0"]
      const text = match[0].value
      let finalNs = ns
      if (match.length === 2) {
        // handle use another ns case
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: any = {}
        for (const option of match[1].properties) {
          options[option.key.name] = option.value.value
        }
        if (options.ns) {
          finalNs = options.ns
        }
      }
      if (localeData[finalNs]) {
        localeData[finalNs].texts[text] = text
      } else {
        console.error(`ns is not correct, ns: ${finalNs}`)
      }
    })

  // Handle `<Trans/> component
  ast
    .find("<Trans $$$0 />")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .each((transItem: any) => {
      const match = transItem.match["$$$0"]
      const nsItem = match.find((item) => item.name.name === "ns")
      const nsVal = nsItem?.value.value || nsItem?.value.expression.value
      if (!nsVal) {
        // ignore, continue
        return
      }
      const i18nKeyItem = match.find((item) => item.name.name === "i18nKey")
      const i18nKeyVal =
        i18nKeyItem?.value.value || i18nKeyItem?.value.expression.value
      if (!i18nKeyVal) {
        // ignore, continue
        return
      }
      localeData[nsVal].texts[i18nKeyVal] = i18nKeyVal
    })
}

function sortLocaleData(localeData: LocaleData) {
  Object.keys(localeData).forEach((ns) => {
    localeData[ns].keys = Object.fromEntries(
      Object.entries(localeData[ns].keys).sort(),
    )
    localeData[ns].texts = Object.fromEntries(
      Object.entries(localeData[ns].texts).sort(),
    )
  })
}

function outputAppLocales(localeData: LocaleData, ns: string, folder: string) {
  if (!folder) {
    console.error(`folder is not correct, just ignore it, ns: ${ns}`)
    return
  }

  const outputDir = `${folder}/locales`
  fs.mkdirSync(outputDir, { recursive: true })

  let outputData = {
    __namespace__: ns,
    __comment__:
      "this file can be updated by running `pnpm gen:locales` command",
    ...localeData[ns].keys,
    // ...localeData[ns].texts, // texts doesn't need to write in the en.json, to save space
  }

  // Write en.json
  fs.writeFileSync(
    path.join(outputDir, "en.json"),
    JSON.stringify(outputData, null, 2) + "\n",
  )

  // Write zh.json
  outputData = {
    ...outputData,
    ...localeData[ns].texts,
  }
  // Update zh.json
  // Check if zh.json exists and merge with existing translations
  const zhPath = path.join(outputDir, "zh.json")
  if (fs.existsSync(zhPath)) {
    const existedZh = JSON.parse(fs.readFileSync(zhPath, "utf-8"))

    // replace outputData with existedZh
    for (const key in existedZh) {
      if (outputData[key]) {
        outputData[key] = existedZh[key]
      }
    }
  }
  fs.writeFileSync(zhPath, JSON.stringify(outputData, null, 2) + "\n")

  // write index.ts
  const indexPath = path.join(outputDir, "index.ts")
  fs.writeFileSync(
    indexPath,
    `import { addLangsLocales } from "@pingcap-incubator/tidb-dashboard-lib-utils"

import en from "./en.json"
import zh from "./zh.json"

addLangsLocales({ en, zh })
`,
  )
}

function outputComponentLocales(
  localeData: LocaleData,
  ns: string,
  filePath: string,
) {
  const code = fs.readFileSync(filePath, "utf-8")
  const ast = $(code)

  const allKeys = Object.keys(localeData[ns].keys).concat(
    Object.keys(localeData[ns].texts),
  )
  ast.replace(
    `type I18nLocaleKeys = $_$`,
    `type I18nLocaleKeys =${allKeys.map((k) => `\n  | "${k}"`).join("")}`,
  )

  // update en
  const keyPartKeys = Object.keys(localeData[ns].keys)
  ast.replace(
    `const en: I18nLocale = { $$$0 }`,
    `const en: I18nLocale = {${keyPartKeys.map((k) => `"${k}": "${localeData[ns].keys[k]}"`).join(",")}}`,
  )

  // get existed zh
  const existedZh = ast.find(`const zh: I18nLocale = { $$$0 }`).match["$$$0"]
  const existedZhLocales = existedZh.reduce(
    (acc, kv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _kv = kv as any
      acc[_kv.key.name] = _kv.value.value
      return acc
    },
    {} as Record<string, string>,
  )
  const zhLocales = {
    ...localeData[ns].keys,
    ...localeData[ns].texts,
  }
  // merge
  Object.keys(existedZhLocales).forEach((k) => {
    if (zhLocales[k]) {
      zhLocales[k] = existedZhLocales[k]
    }
  })
  // update zh
  ast.replace(
    `const zh: I18nLocale = { $$$0 }`,
    `const zh: I18nLocale = {${allKeys.map((k) => `\n  "${k}": "${zhLocales[k]}"`).join(",")}\n}`,
  )

  fs.writeFileSync(filePath, ast.generate())
}

//----------------------

generateLocales().catch(console.error)
