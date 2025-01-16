import { UiKitThemeProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps"

import { ReactQueryProvider } from "./providers/react-query-provider"
import { RouterProvider } from "./router/provider"

import "@tidbcloud/uikit/style.css"
import "@pingcap-incubator/tidb-dashboard-lib-charts/dist/style.css"
import "./App.css"

function App() {
  return (
    <UiKitThemeProvider>
      <ReactQueryProvider>
        <RouterProvider />
      </ReactQueryProvider>
    </UiKitThemeProvider>
  )
}

export default App
