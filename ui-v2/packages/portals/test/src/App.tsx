import {
  UIKitThemeProvider,
  UrlStateProvider,
} from "@pingcap-incubator/tidb-dashboard-lib-apps"
import { ChartThemeSwitch } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Stack,
  useComputedColorScheme,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useHotkeyChangeLang } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  HashRouter as Router,
  // BrowserRouter as Router,
  useLocation,
  useNavigate,
} from "react-router-dom"

import { IndexAdvisorApp } from "./apps/index-advisor"
import { MetricsApp } from "./apps/metric"
import { SlowQueryApp } from "./apps/slow-query"
import { StatementApp } from "./apps/statement"
import { AppLayout } from "./components/app-layout"
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
    <Stack p={16}>
      <ReactRouter6UrlStateProvider>
        <MetricsApp />
        <SlowQueryApp />
        <StatementApp />
        <IndexAdvisorApp />
      </ReactRouter6UrlStateProvider>
      <ChartThemeSwitch value={theme} />
    </Stack>
  )
}

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppLayout>
            <Routes />
          </AppLayout>
        </Router>
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
