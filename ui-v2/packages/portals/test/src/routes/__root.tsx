import { ChartThemeSwitch } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { useHotkeyChangeLang } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { useComputedColorScheme } from "@tidbcloud/uikit"

import { RouterDevtools } from "../router/devtools"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  useHotkeyChangeLang()
  const theme = useComputedColorScheme()

  return (
    <>
      <Outlet />
      <RouterDevtools position="bottom-right" />
      <ChartThemeSwitch value={theme} />
    </>
  )
}
