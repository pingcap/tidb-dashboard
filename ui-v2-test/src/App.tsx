
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MetricsAzoresOverviewApp } from "./metric-azores-overview"

import { UIKitThemeProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps"

import { useHotkeyChangeLang } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useComputedColorScheme } from "@tidbcloud/uikit"
import { ChartThemeSwitch } from "@pingcap-incubator/tidb-dashboard-lib-charts"

import "@tidbcloud/uikit/style.css"

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

function MicroApps() {
  useHotkeyChangeLang()
  const theme = useComputedColorScheme()
  return (
    <>
      <MetricsAzoresOverviewApp />
      <ChartThemeSwitch value={theme} />
    </>
  )
}

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MicroApps />
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
