import {
  MantineProvider,
  UrlStateProvider,
} from "@pingcap-incubator/tidb-dashboard-lib-apps"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  Link,
  BrowserRouter as Router,
  useLocation,
  useNavigate,
} from "react-router-dom"

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
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Link to="/slow-query/list">Slow Query</Link>
          <ReactRouter6UrlStateProvider>
            <SlowQueryApp />
          </ReactRouter6UrlStateProvider>
        </Router>
      </QueryClientProvider>
    </MantineProvider>
  )
}

export default App
