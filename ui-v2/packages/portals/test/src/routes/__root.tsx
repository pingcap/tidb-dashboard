import { ChartThemeSwitch } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { useComputedColorScheme } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  UrlStateProvider,
  useHotkeyChangeLang,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Outlet,
  createRootRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import { useMemo } from "react"

import { RouterDevtools } from "../router/devtools"

export const Route = createRootRoute({
  component: RootComponent,
})

function TanStackRouterUrlStateProvider(props: { children: React.ReactNode }) {
  const loc = useLocation()
  const navigate = useNavigate()

  const ctxValue = useMemo(() => {
    return {
      urlQuery: loc.searchStr,
      setUrlQuery(v: string) {
        navigate({ to: `${loc.pathname}?${v}` })
      },
    }
  }, [loc.pathname, loc.search, navigate])

  return <UrlStateProvider value={ctxValue}>{props.children}</UrlStateProvider>
}

function RootComponent() {
  useHotkeyChangeLang()
  const theme = useComputedColorScheme()

  return (
    <>
      <TanStackRouterUrlStateProvider>
        <Outlet />
      </TanStackRouterUrlStateProvider>
      <ChartThemeSwitch value={theme} />
      <RouterDevtools position="bottom-right" />
    </>
  )
}
