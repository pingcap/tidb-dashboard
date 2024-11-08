import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { http } from "../../rapper"

import listData from "./sample-data/list.json"

export function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()
  const [enableBack, setEnableBack] = useState(false)

  return useMemo(
    () => ({
      ctxId: "unique-id",
      api: {
        getSlowQueries(_params: { limit: number; term: string }) {
          // return http("GET/slow-query/list", params).then((d) => d.items)
          return Promise.resolve(listData)
        },
        getSlowQuery(params: { id: number }) {
          return http("GET/slow-query/detail", params)
        },
        getDbs() {
          return Promise.resolve(["db1", "db2"])
        },
        getRuGroups() {
          return Promise.resolve(["default", "ru1", "ru2"])
        },
      },
      cfg: {
        title: "",
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
