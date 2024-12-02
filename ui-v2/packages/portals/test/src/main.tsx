import { initI18n } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"
import { http } from "./rapper"

import "./index.css"

initI18n()

// always use mock api, even in production
http.interceptors.request.use((config) => {
  config.baseURL = "https://rapapi.cn/api/app/mock/18"
  return config
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
