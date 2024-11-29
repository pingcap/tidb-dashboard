import {
  UIKitThemeProvider,
  UrlStateProvider,
} from "@pingcap-incubator/tidb-dashboard-lib-apps"
import { ChartThemeSwitch } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Group,
  Stack,
  useComputedColorScheme,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useHotkeyChangeLang } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  Link,
  HashRouter as Router,
  // BrowserRouter as Router,
  useLocation,
  useNavigate,
} from "react-router-dom"

import { IndexAdvisorApp } from "./apps/index-advisor"
import { MetricsApp } from "./apps/metric"
import { MetricsAzoresHostApp } from "./apps/metric-azores-host"
import { MetricsAzoresOverviewApp } from "./apps/metric-azores-overview"
import { SlowQueryApp } from "./apps/slow-query"
import { StatementApp } from "./apps/statement"
import { http } from "./rapper"

import "@tidbcloud/uikit/style.css"
import "./App.css"

// always use mock api, even in production
http.interceptors.request.use((config) => {
  config.baseURL = "https://rapapi.cn/api/app/mock/18"
  return config
})

// Create a react query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // retry: 1
      // refetchOnMount: false,
      // refetchOnReconnect: false,
    },
  },
})

function ReactRouter6UrlStateProvider(props: { children: React.ReactNode }) {
  const loc = useLocation()
  const navigate = useNavigate()

  const ctxValue = useMemo(() => {
    return {
      urlQuery: loc.search,
      setUrlQuery(v: string) {
        navigate(`${loc.pathname}?${v}`)
      },
    }
  }, [loc.pathname, loc.search, navigate])

  return <UrlStateProvider value={ctxValue}>{props.children}</UrlStateProvider>
}

function Routes() {
  useHotkeyChangeLang()
  const theme = useComputedColorScheme()

  return (
    <Router>
      <Stack p={16}>
        <Group>
          <Link to="/slow-query/list">Slow Query</Link>
          <Link to="/statement/list">Statement</Link>
          <Link to="/metrics">Metrics</Link>
          <Link to="/metrics-azores-overview">Metrics Azores Overview</Link>
          <Link to="/metrics-azores-host">Metrics Azores Host</Link>
          <Link to="/index-advisor/list">Index Advisor</Link>
        </Group>
        <ReactRouter6UrlStateProvider>
          <SlowQueryApp />
          <StatementApp />
          <MetricsApp />
          <MetricsAzoresOverviewApp />
          <MetricsAzoresHostApp />
          <IndexAdvisorApp />
        </ReactRouter6UrlStateProvider>
        <ChartThemeSwitch value={theme} />
      </Stack>
    </Router>
  )
}

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Routes />
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
