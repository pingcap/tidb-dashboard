import { useUrlState } from "@pingcap-incubator/tidb-dashboard-lib-utils"

type DetailUrlState = Partial<Record<"id", string>>

export function useDetailUrlState() {
  const [queryParams, _] = useUrlState<DetailUrlState>()

  const id = parseInt(queryParams.id ?? "0")

  return {
    id,
  }
}
