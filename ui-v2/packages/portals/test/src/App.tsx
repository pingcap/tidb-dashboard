import { UIKitThemeProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps"

import { ReactQueryProvider } from "./providers/react-query-provider"
import { RouterProvider } from "./router/provider"

import "@tidbcloud/uikit/style.css"
import "./App.css"

function App() {
  return (
    <UIKitThemeProvider>
      <ReactQueryProvider>
        <RouterProvider />
      </ReactQueryProvider>
    </UIKitThemeProvider>
  )
}

export default App
