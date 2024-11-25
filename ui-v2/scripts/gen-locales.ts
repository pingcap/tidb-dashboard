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

async function generateLocales() {
  // Initialize locale data structure
  const localeData: LocaleData = {}

  // Scan all TypeScript/JavaScript files in the apps folder
  const files = await glob("packages/libs/4-apps/src/**/*.{ts,tsx,js,jsx}")

  for (const file of files) {
    const code = fs.readFileSync(file, "utf-8")
    const ast = $(code)

    // get appName from file path
    const appName = file.split("/")[4]

    // check app name
    // app name in the `useTn` call should be the same as the file path
    let hasTn = false
    ast
      .find("const { $$$0 } = useTn($_$0)")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((item: any) => {
        const _app = item.match[0][0].value
        if (_app !== appName) {
          console.error(file)
          console.error(`app name mismatch: ${_app}, expected ${appName}`)
          return
        }
        hasTn = true
      })
    if (!hasTn) {
      continue
    }

    // init app data
    if (!localeData[appName]) {
      localeData[appName] = {
        keys: {},
        texts: {},
      }
    }

    // Find tt calls
    // Handle `tt` calls, likes:
    // tt('Clear Filters')
    // tt('{{count}} items', { count: 10 })
    ast
      .find("tt($_$)")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((tnItem: any) => {
        const text = tnItem.match[0][0].value
        localeData[appName].texts[text] = text
      })

    // Find tk calls
    // Handle `tk` calls, likes:
    // tk(`panels.${props.config.category}`)
    // tk("panels.instance_top", "Top 5 Node Utilization")
    // tk("time_range.hour", "{{count}} hr", { count: 1 })
    // tk("time_range.hour", "{{count}} hrs", { count: 24 })
    ast
      .find("tk($$$0)")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((tkItem: any) => {
        const match = tkItem.match["$$$0"]
        if (match.length === 1 || match[0].value === undefined) {
          // ignore this kind of case, likes:
          // tk(`panels.${props.config.category}`)
          // console.log('skip')
        } else {
          let key = match[0].value
          const value = match[1].value
          if (match.length === 3) {
            // handle plural case
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const options: any = {}
            for (const option of match[2].properties) {
              options[option.key.name] = option.value.value
            }
            if (options.count === 0) {
              key = `${key}_zero`
            } else if (options.count === 1) {
              key = `${key}_one`
            } else {
              key = `${key}_other`
            }
          }

          const keyParts = key.split(".")
          let current = localeData[appName].keys
          for (let i = 0; i < keyParts.length - 1; i++) {
            if (!current[keyParts[i]]) {
              current[keyParts[i]] = {}
            }
            current = current[keyParts[i]]
          }
          const lastKey = keyParts.at(-1)
          current[lastKey] = value
        }
      })
  }

  // Ensure output directory exists
  for (const app of Object.keys(localeData)) {
    const outputDir = `packages/libs/4-apps/src/${app}/locales`
    fs.mkdirSync(outputDir, { recursive: true })

    const outputData = {}
    outputData[app] = localeData[app]
    // Write en.json
    fs.writeFileSync(
      path.join(outputDir, "en.json"),
      JSON.stringify(outputData, null, 2),
    )

    // Write zh.json (same structure as en.json for now)
    fs.writeFileSync(
      path.join(outputDir, "zh.json"),
      JSON.stringify(outputData, null, 2),
    )
  }
}

generateLocales().catch(console.error)
