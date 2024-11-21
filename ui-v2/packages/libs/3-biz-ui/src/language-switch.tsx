import { useHotkeys, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"

export function LanguageSwitch() {
  const { i18n } = useTn()
  useHotkeys([
    ["mod+L", () => i18n.changeLanguage(i18n.language === "en" ? "zh" : "en")],
  ])
  return null
}
