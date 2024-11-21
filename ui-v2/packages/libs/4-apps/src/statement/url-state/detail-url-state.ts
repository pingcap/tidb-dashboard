import { useUrlState } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

type DetailUrlState = Partial<Record<"id" | "plans", string>>

export function useDetailUrlState() {
  const [queryParams, setQueryParams] = useUrlState<DetailUrlState>()

  const id = queryParams.id ?? ""

  const plans = useMemo<string[]>(() => {
    const _plans = queryParams.plans
    return _plans ? _plans.split(",") : []
  }, [queryParams.plans])
  const setPlans = useCallback(
    (newPlans: string[]) => {
      setQueryParams({ plans: newPlans.join(",") || undefined })
    },
    [setQueryParams],
  )

  return {
    id,

    plans,
    setPlans,
  }
}
