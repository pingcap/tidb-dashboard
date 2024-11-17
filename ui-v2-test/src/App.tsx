
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MetricsAzoresOverviewApp } from "./metric-azores-overview"

import { UIKitThemeProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps"

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

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
          <MetricsAzoresOverviewApp />
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
