import { axiosClient } from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import { initI18n } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"

import "./index.css"

initI18n()

axiosClient.interceptors.request.use((config) => {
  // env: ''
  // prod: 'https://tidb-dashboard-lib-api-server.2008-hbl-cf.workers.dev'
  config.baseURL = import.meta.env.VITE_API_BASE_URL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config.headers = { "Ti-Env": "dev" } as any
  return config
})

// handle error
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log(error)
    return Promise.reject(error)
  },
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
