import {
  UIKitThemeProvider,
  UrlStateProvider,
} from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  Group,
  Stack,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
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
import { MetricsTemOverviewApp } from "./apps/metric-tem-overview"
import { SlowQueryApp } from "./apps/slow-query"
import { StatementApp } from "./apps/statement"
import { http } from "./rapper"

import "./App.css"

import "@tidbcloud/uikit/style.css"

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

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Stack p={16}>
            <Group>
              <Link to="/slow-query/list">Slow Query</Link>
              <Link to="/statement/list">Statement</Link>
              <Link to="/metrics">Metrics</Link>
              <Link to="/metrics-tem-overview">Metrics Tem Overview</Link>
              <Link to="/index-advisor/list">Index Advisor</Link>
            </Group>
            <ReactRouter6UrlStateProvider>
              <SlowQueryApp />
              <StatementApp />
              <MetricsApp />
              <MetricsTemOverviewApp />
              <IndexAdvisorApp />
            </ReactRouter6UrlStateProvider>
          </Stack>
        </Router>
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
