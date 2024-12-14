import { UrlStateProvider } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

export function TanStackRouterUrlStateProvider(props: {
  children: React.ReactNode
}) {
  const loc = useLocation()
  const navigate = useNavigate()

  const ctxValue = useMemo(() => {
    return {
      urlQuery: loc.searchStr,
      setUrlQuery(v: string) {
        navigate({ to: `${loc.pathname}?${v}` })
      },
    }
  }, [loc.searchStr, loc.pathname, navigate])

  return <UrlStateProvider value={ctxValue}>{props.children}</UrlStateProvider>
}
