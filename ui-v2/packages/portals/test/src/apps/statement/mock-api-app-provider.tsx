import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

export function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()
  const [enableBack, setEnableBack] = useState(false)

  return useMemo(
    () => ({
      ctxId: "statement",
      api: {
        getStmtKinds() {
          return Promise.resolve(["Select", "Update", "Delete"])
        },
        getDbs() {
          return Promise.resolve(["db1", "db2"])
        },
        getRuGroups() {
          return Promise.resolve(["default", "ru1", "ru2"])
        },

        getStmtList() {
          return Promise.resolve([])
        },
        getStmtPlans() {
          return Promise.resolve([])
        },
        getStmtPlansDetail() {
          return Promise.reject("not implement yet")
        },
      },
      cfg: {
        title: "",
      },
      actions: {
        openDetail: (id: string) => {
          setEnableBack(true)
          navigate(`/statement/detail?id=${id}`)
        },
        backToList: () => {
          if (enableBack) {
            navigate(-1)
          } else {
            navigate("/statement/list")
          }
        },
      },
    }),
    [navigate, enableBack],
  )
}
