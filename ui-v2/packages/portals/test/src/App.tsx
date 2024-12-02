import { UIKitThemeProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { http } from "./rapper"
import { RouterProvider } from "./router/provider"

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

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider />
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
