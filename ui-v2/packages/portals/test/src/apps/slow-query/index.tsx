import {
  AppProvider,
  List,
  Detail,
  AppCtxValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { useMemo, useState } from "react"
import { Route, Routes, useNavigate } from "react-router-dom"

import sampleData from "./sample-data.json"

function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()
  const [enableBack, setEnableBack] = useState(false)

  return useMemo(
    () => ({
      ctxId: "unique-id",
      api: {
        getSlowQueries(params: { term: string }) {
          return new Promise((resolve) => {
            setTimeout(() => {
              const filteredData = sampleData.filter((s) =>
                s.query.includes(params.term),
              )
              resolve(filteredData)
            }, 2000)
          })
        },
        getSlowQuery(params: { id: number }) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              const slowQuery = sampleData.find((s) => s.id === params.id)
              if (slowQuery) {
                resolve(slowQuery)
              } else {
                reject(new Error("Slow query not found"))
              }
            }, 2000)
          })
        },
      },
      cfg: {
        title: "Slow Query",
        showSearch: true,
      },
      actions: {
        openDetail: (id: number) => {
          setEnableBack(true)
          navigate(`/slow-query/detail?id=${id}`)
        },
        backToList: () => {
          if (enableBack) {
            navigate(-1)
          } else {
            navigate("/slow-query/list")
          }
        },
      },
    }),
    [navigate, enableBack],
  )
}

export function SlowQueryApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/slow-query/list" element={<List />} />
        <Route path="/slow-query/detail" element={<Detail />} />
      </Routes>
    </AppProvider>
  )
}
