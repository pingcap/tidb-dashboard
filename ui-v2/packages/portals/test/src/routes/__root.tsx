import { ChartThemeSwitch } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { useComputedColorScheme } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useHotkeyChangeLang } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Outlet, createRootRoute } from "@tanstack/react-router"

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
