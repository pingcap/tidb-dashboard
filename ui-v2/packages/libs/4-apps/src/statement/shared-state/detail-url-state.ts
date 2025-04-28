import { useUrlState } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback } from "react"

type DetailUrlState = Partial<Record<"id" | "plan", string>>

export function useDetailUrlState() {
  const [queryParams, setQueryParams] = useUrlState<DetailUrlState>()

  const id = queryParams.id ?? ""

  const plan = queryParams.plan ?? ""
  const setPlan = useCallback(
    (newPlan: string) => {
      setQueryParams({ plan: newPlan || undefined })
    },
    [setQueryParams],
  )

  return {
    id,

    plan,
    setPlan,
  }
}
