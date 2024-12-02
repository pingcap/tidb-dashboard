import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  StatementModel,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

import listData from "./sample-data/list-2.json"
import plansDetailData from "./sample-data/plans-detail-1.json"
import plansListData from "./sample-data/plans-list-1.json"
import slowQueryListData from "./sample-data/slow-query-list-1.json"

declare global {
  interface Window {
    preUrl?: string[]
  }
}

export function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()

  return useMemo(
    () => ({
      ctxId: "statement",
      api: {
        getStmtKinds() {
          return delay(1000).then(() => ["Select", "Update", "Delete"])
        },
        getDbs() {
          return delay(1000).then(() => ["db1", "db2"])
        },
        getRuGroups() {
          return delay(1000).then(() => ["default", "ru1", "ru2"])
        },

        getStmtList() {
          return delay(1000).then(() => listData)
        },
        getStmtPlans() {
          return delay(1000).then(() => plansListData)
        },
        getStmtPlansDetail() {
          return delay(1000)
            .then(() => plansDetailData as StatementModel)
            .then((d) => {
              if (d.binary_plan_text) {
                d.plan = d.binary_plan_text
              }
              return d
            })
        },
        getSlowQueryList() {
          return delay(1000).then(() => slowQueryListData)
        },
      },
      cfg: {
        title: "",
      },
      actions: {
        openDetail: (id: string) => {
          window.preUrl = [window.location.hash.slice(1)]
          navigate({ to: `/statement/detail?id=${id}` })
        },
        backToList: () => {
          const preUrl = window.preUrl?.pop()
          navigate({ to: preUrl || "/statement/list" })
        },
        openSlowQueryDetail: (id: string) => {
          window.preUrl = [
            ...(window.preUrl || []),
            window.location.hash.slice(1),
          ]
          navigate({ to: `/slow-query/detail?id=${id}` })
        },
      },
    }),
    [navigate],
  )
}
