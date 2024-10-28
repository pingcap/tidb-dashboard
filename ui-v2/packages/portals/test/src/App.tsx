import {
  UIKitThemeProvider,
  UrlStateProvider,
} from "@pingcap-incubator/tidb-dashboard-lib-apps"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  Link,
  HashRouter as Router,
  // BrowserRouter as Router,
  useLocation,
  useNavigate,
} from "react-router-dom"

import { IndexAdvisorApp } from "./apps/index-advisor"
import { SlowQueryApp } from "./apps/slow-query"

import "./App.css"

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

  return (
    <UrlStateProvider
      value={{
        urlQuery: loc.search,
        setUrlQuery(v: string) {
          navigate(`${loc.pathname}?${v}`)
        },
      }}
    >
      {props.children}
    </UrlStateProvider>
  )
}

function App() {
  return (
    <UIKitThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Link to="/slow-query/list">Slow Query</Link>
          <Link to="/index-advisor/list">Index Advisor</Link>
          <ReactRouter6UrlStateProvider>
            <SlowQueryApp />
            <IndexAdvisorApp />
          </ReactRouter6UrlStateProvider>
        </Router>
      </QueryClientProvider>
    </UIKitThemeProvider>
  )
}

export default App
