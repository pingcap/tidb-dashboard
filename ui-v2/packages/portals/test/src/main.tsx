import { initI18n } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"
import { http } from "./rapper"

import "./index.css"

initI18n()

// always use mock api, even in production
http.interceptors.request.use((config) => {
  // @todo: set in env
  // config.baseURL = "https://rapapi.cn/api/app/mock/18"
  // config.baseURL = "http://10.2.13.64:8087"
  config.baseURL = ""
  config.headers = {
    "Ti-Env": "dev",
  }
  return config
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
