import * as fs from "fs"
import * as path from "path"

import { glob } from "glob"
import $ from "gogocode"

interface LocaleData {
  [app: string]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keys: Record<string, any>
    texts: Record<string, string>
  }
}

function sortLocaleData(localeData: LocaleData) {
  Object.keys(localeData).forEach((appName) => {
    localeData[appName].keys = Object.fromEntries(
      Object.entries(localeData[appName].keys).sort(),
    )
    localeData[appName].texts = Object.fromEntries(
      Object.entries(localeData[appName].texts).sort(),
    )
  })
}

async function generateLocales() {
  // Initialize locale data structure
  const localeData: LocaleData = {}

  // Scan all TypeScript/JavaScript files in the apps folder
  const files = await glob("packages/libs/4-apps/src/**/*.{ts,tsx,js,jsx}")

  for (const filePath of files) {
    const code = fs.readFileSync(filePath, "utf-8")
    const ast = $(code)

    // check app name
    // app name in the `useTn` call should be the same as the file path
    let hasTn = false
    let appFolder = ""
    ast
      .find("const { $$$0 } = useTn($_$0)")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((item: any) => {
        const appName = item.match[0][0].value
        const appFolderPos = filePath.indexOf(`/${appName}/`)
        if (appFolderPos === -1) {
          console.error(filePath)
          console.error(`app name mismatch: ${appName}`)
          return
        } else {
          appFolder = filePath.slice(0, appFolderPos) + "/" + appName
          // console.log(appFolder)
        }
        hasTn = true
      })
    if (!hasTn) {
      continue
    }

    // init app data
    if (!localeData[appFolder]) {
      localeData[appFolder] = {
        keys: {},
        texts: {},
      }
    }

    // Handle `tt` calls, likes:
    // tt('Clear Filters')
    // tt("hello {{name}}", { name: "world" })
    ast
      .find("tt($_$)")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((tnItem: any) => {
        const text = tnItem.match[0][0].value
        localeData[appFolder].texts[text] = text
      })

    // Handle `tk` calls, likes:
    // tk(`panels.${props.config.category}`)
    // tk("panels.instance_top", "Top 5 Node Utilization")
    // tk("time_range.hour", "{{count}} hr", { count: 1 })
    // tk("time_range.hour", "{{count}} hrs", { count: 24 })
    // tk("time_range.hour", "", {count: n})
    ast
      .find("tk($$$0)")
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
          }

          // check whether value is existed
          const existedVal = localeData[appFolder].keys[key]
          if (existedVal !== undefined && existedVal !== value) {
            console.error(
              `same keys but have different values, key: ${key}, values: ${existedVal}, ${value}`,
            )
            // break
            return false
          }
          localeData[appFolder].keys[key] = value
        }
      })
  }

  // Sort
  sortLocaleData(localeData)

  // Ensure output directory exists
  for (const appFolder of Object.keys(localeData)) {
    const outputDir = `${appFolder}/locales`
    fs.mkdirSync(outputDir, { recursive: true })

    const outputData = {
      comment: "this file can be updated by running `pnpm gen:locales` command",
    }
    const appName = appFolder.split("/").pop() || ""
    outputData[appName] = localeData[appFolder]

    // Write en.json
    fs.writeFileSync(
      path.join(outputDir, "en.json"),
      JSON.stringify(outputData, null, 2) + "\n",
    )

    // Update zh.json
    // Check if zh.json exists and merge with existing translations
    const zhPath = path.join(outputDir, "zh.json")
    if (fs.existsSync(zhPath)) {
      const existingZh = JSON.parse(fs.readFileSync(zhPath, "utf-8"))

      // Clean up keys by removing entries that don't exist in outputData
      const cleanedKeys = {}
      for (const key in existingZh[appName]?.keys) {
        if (key in outputData[appName].keys) {
          cleanedKeys[key] = existingZh[appName].keys[key]
        }
      }

      // Clean up texts by removing entries that don't exist in outputData
      const cleanedTexts = {}
      for (const key in existingZh[appName]?.texts) {
        if (key in outputData[appName].texts) {
          cleanedTexts[key] = existingZh[appName].texts[key]
        }
      }

      const merged = {
        [appName]: {
          keys: {
            ...outputData[appName].keys,
            ...cleanedKeys,
          },
          texts: {
            ...outputData[appName].texts,
            ...cleanedTexts,
          },
        },
      }
      sortLocaleData(merged)
      const final = {
        comment: outputData.comment,
        [appName]: merged[appName],
      }
      fs.writeFileSync(zhPath, JSON.stringify(final, null, 2) + "\n")
    } else {
      fs.writeFileSync(zhPath, JSON.stringify(outputData, null, 2) + "\n")
    }

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
}

generateLocales().catch(console.error)
