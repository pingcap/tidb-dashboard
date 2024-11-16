import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"

export function useMetricQueriesConfigData(kind: string) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [ctx.ctxId, "metric", "queries-config", kind],
    queryFn: () => ctx.api.getMetricQueriesConfig(kind),
  })
}
